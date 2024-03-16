import { FocusMonitor } from "@angular/cdk/a11y";
import { BooleanInput, coerceBooleanProperty } from "@angular/cdk/coercion";
import {
  Component,
  ElementRef,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  Self,
  ViewChild,
  forwardRef,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import {
  AbstractControl,
  ControlValueAccessor,
  FormBuilder,
  FormControl,
  FormGroup,
  NgControl,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from "@angular/forms";
import {
  MAT_FORM_FIELD,
  MatFormField,
  MatFormFieldControl,
  MatFormFieldModule,
} from "@angular/material/form-field";
import { Subject } from "rxjs";
import { MatIconModule } from "@angular/material/icon";
import { AsyncPipe } from "@angular/common";

/** @title Form field with custom telephone number input control. */
@Component({
  selector: "form-field-custom-control-example",
  templateUrl: "form-field-custom-control-example.html",
  standalone: true,
  imports: [
    AsyncPipe,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    forwardRef(() => MyTelInput),
    MatIconModule,
  ],
})
export class FormFieldCustomControlExample implements OnInit {
  public isDisabled: boolean = false;
  form: FormGroup = new FormGroup({
    tel: new FormControl(null),
  });

  private readonly telFormControl = this.form.controls.tel;

  public onNgDisableChange(isDisabled: boolean) {
    setTimeout(() => {
      console.log(
        "onNgDisableChange: Attempting to set control disabled state",
        {
          isDisabled,
          parentIsDisabled: this.isDisabled,
          controlIsDisabled: this.telFormControl.disabled,
        }
      );
      this.isDisabled = isDisabled;
    });
  }

  @ViewChild(forwardRef(() => MyTelInput), { static: true })
  private readonly telInput!: MyTelInput;
  ngOnInit() {
    this.telInput.ngDisabledChange.subscribe(() => {
      console.log("onNgDisabledChange", {
        controlIsDisabled: this.form.controls.tel.disabled,
        isDisabled: this.isDisabled,
      });
    });
  }
}

/** Data structure for holding telephone number. */
export class MyTel {
  constructor(
    public area: string,
    public exchange: string,
    public subscriber: string
  ) {}
}

/** Custom `MatFormFieldControl` for telephone number input. */
@Component({
  selector: "example-tel-input",
  templateUrl: "example-tel-input-example.html",
  styleUrl: "example-tel-input-example.css",
  providers: [
    { provide: MatFormFieldControl, useExisting: forwardRef(() => MyTelInput) },
  ],
  host: {
    "[class.example-floating]": "shouldLabelFloat",
    "[id]": "id",
  },
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
})
export class MyTelInput
  implements
    ControlValueAccessor,
    MatFormFieldControl<MyTel>,
    OnDestroy,
    OnChanges
{
  static nextId = 0;
  @ViewChild("area") areaInput: HTMLInputElement;
  @ViewChild("exchange") exchangeInput: HTMLInputElement;
  @ViewChild("subscriber") subscriberInput: HTMLInputElement;

  parts: FormGroup<{
    area: FormControl<string | null>;
    exchange: FormControl<string | null>;
    subscriber: FormControl<string | null>;
  }>;
  stateChanges = new Subject<void>();
  focused = false;
  touched = false;
  controlType = "example-tel-input";
  id = `example-tel-input-${MyTelInput.nextId++}`;
  onChange = (_: any) => {};
  onTouched = () => {};

  get empty() {
    const {
      value: { area, exchange, subscriber },
    } = this.parts;

    return !area && !exchange && !subscriber;
  }

  get shouldLabelFloat() {
    return this.focused || !this.empty;
  }

  @Input("aria-describedby") userAriaDescribedBy: string;

  @Input()
  get placeholder(): string {
    return this._placeholder;
  }
  set placeholder(value: string) {
    this._placeholder = value;
    this.stateChanges.next();
  }
  private _placeholder: string;

  @Input()
  get required(): boolean {
    return this._required;
  }
  set required(value: BooleanInput) {
    this._required = coerceBooleanProperty(value);
    this.stateChanges.next();
  }
  private _required = false;
  private _disabled = false;

  get disabled(): boolean {
    return this._disabled;
  }

  // The control shouldn't be using disabled as an input name
  @Input("ngDisabled")
  set disabled(value: BooleanInput) {
    this.setDisabled(value);
  }
  @Output() ngDisabledChange = new EventEmitter<boolean>();

  public setDisabled(
    isDisabled: BooleanInput,
    bySetDisabledState: boolean = false
  ) {
    console.log("Pre Setting Disabled", {
      curIsDisabled: this._disabled,
      newIsDisabled: isDisabled,
      controlIsDisabled: this.ngControl.disabled,
      partsIsDisabled: this.parts.disabled,
      bySetDisabledState,
    });
    this._disabled = coerceBooleanProperty(isDisabled);
    this._disabled ? this.parts.disable() : this.parts.enable();
    this.stateChanges.next();
    this.ngDisabledChange.emit(this._disabled);

    if (
      !bySetDisabledState &&
      this.ngControl.control &&
      isDisabled !== this.ngControl.disabled
    ) {
      console.log("Calling:", isDisabled ? "enable" : "disable");

      this.ngControl.control[isDisabled ? "enable" : "disable"]({
        emitEvent: false,
      });
    }
    console.log("Post Setting Disabled", {
      curIsDisabled: this._disabled,
      newIsDisabled: isDisabled,
      controlIsDisabled: this.ngControl.disabled,
      partsIsDisabled: this.parts.disabled,
    });
  }

  public ngOnChanges(changes: SimpleChanges) {
    console.log("ngOnChanges", changes);
  }

  @Input()
  get value(): MyTel | null {
    if (this.parts.valid) {
      const {
        value: { area, exchange, subscriber },
      } = this.parts;
      return new MyTel(area!, exchange!, subscriber!);
    }
    return null;
  }
  set value(tel: MyTel | null) {
    const { area, exchange, subscriber } = tel || new MyTel("", "", "");
    this.parts.setValue({ area, exchange, subscriber });
    this.stateChanges.next();
  }

  get errorState(): boolean {
    return this.parts.invalid && this.touched;
  }

  constructor(
    formBuilder: FormBuilder,
    private _focusMonitor: FocusMonitor,
    private _elementRef: ElementRef<HTMLElement>,
    @Optional() @Inject(MAT_FORM_FIELD) public _formField: MatFormField,
    @Optional() @Self() public ngControl: NgControl
  ) {
    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }

    this.parts = formBuilder.group({
      area: [
        "",
        [Validators.required, Validators.minLength(3), Validators.maxLength(3)],
      ],
      exchange: [
        "",
        [Validators.required, Validators.minLength(3), Validators.maxLength(3)],
      ],
      subscriber: [
        "",
        [Validators.required, Validators.minLength(4), Validators.maxLength(4)],
      ],
    });
  }

  ngOnDestroy() {
    this.stateChanges.complete();
    this._focusMonitor.stopMonitoring(this._elementRef);
  }

  onFocusIn(event: FocusEvent) {
    if (!this.focused) {
      this.focused = true;
      this.stateChanges.next();
    }
  }

  onFocusOut(event: FocusEvent) {
    if (
      !this._elementRef.nativeElement.contains(event.relatedTarget as Element)
    ) {
      this.touched = true;
      this.focused = false;
      this.onTouched();
      this.stateChanges.next();
    }
  }

  autoFocusNext(
    control: AbstractControl,
    nextElement?: HTMLInputElement
  ): void {
    if (!control.errors && nextElement) {
      this._focusMonitor.focusVia(nextElement, "program");
    }
  }

  autoFocusPrev(control: AbstractControl, prevElement: HTMLInputElement): void {
    if (control.value.length < 1) {
      this._focusMonitor.focusVia(prevElement, "program");
    }
  }

  setDescribedByIds(ids: string[]) {
    const controlElement = this._elementRef.nativeElement.querySelector(
      ".example-tel-input-container"
    )!;
    controlElement.setAttribute("aria-describedby", ids.join(" "));
  }

  onContainerClick() {
    if (this.parts.controls.subscriber.valid) {
      this._focusMonitor.focusVia(this.subscriberInput, "program");
    } else if (this.parts.controls.exchange.valid) {
      this._focusMonitor.focusVia(this.subscriberInput, "program");
    } else if (this.parts.controls.area.valid) {
      this._focusMonitor.focusVia(this.exchangeInput, "program");
    } else {
      this._focusMonitor.focusVia(this.areaInput, "program");
    }
  }

  writeValue(tel: MyTel | null): void {
    this.value = tel;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    console.log("setDisabledState called with: ", isDisabled);
    this.setDisabled(isDisabled, true);
  }

  _handleInput(control: AbstractControl, nextElement?: HTMLInputElement): void {
    this.autoFocusNext(control, nextElement);
    this.onChange(this.value);
  }
}

/**  Copyright 2024 Google LLC. All Rights Reserved.
    Use of this source code is governed by an MIT-style license that
    can be found in the LICENSE file at https://angular.io/license */
