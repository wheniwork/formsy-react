import React from 'react';
import PropTypes from 'prop-types';
import formDataToObject from 'form-data-to-object';

import utils from './utils';
import validationRules from './validationRules';
import Wrapper, { propTypes } from './Wrapper';

import { IData, IModel, InputComponent, IResetModel, IUpdateInputsWithError, ValidationFunction } from './interfaces';

type FormHTMLAttributesCleaned = Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onChange' | 'onSubmit'>;

export let formValidateCounter = 0;
export let componentValidateCounter = 0;
export let getValuesCounter = 0;

export function resetCounters() {
  formValidateCounter = 0;
  componentValidateCounter = 0;
  getValuesCounter = 0;
}

/* eslint-disable react/no-unused-state, react/default-props-match-prop-types */
export interface FormsyProps extends FormHTMLAttributesCleaned {
  disabled: boolean;
  getErrorMessage: any;
  getErrorMessages: any;
  getValue: any;
  hasValue: any;
  isFormDisabled: any;
  isFormSubmitted: any;
  isPristine: any;
  isRequired: any;
  isValid: any;
  isValidValue: any;
  mapping: null | ((model: IModel) => IModel);
  onChange: (model: IModel, isChanged: boolean) => void;
  onError: any;
  onInvalid: () => void;
  onInvalidSubmit: any;
  onReset?: () => void;
  onSubmit?: (model: IModel, resetModel: IResetModel, updateInputsWithError: IUpdateInputsWithError) => void;
  onValid: () => void;
  onValidSubmit?: (model: IModel, resetModel: IResetModel, updateInputsWithError: IUpdateInputsWithError) => void;
  preventExternalInvalidation?: boolean;
  resetValue: any;
  setValidations: any;
  setValue: any;
  showError: any;
  showRequired: any;
  validationErrors?: null | object;
}

export interface FormsyState {
  canChange: boolean;
  formSubmitted?: boolean;
  isPristine?: boolean;
  isSubmitting: boolean;
  isValid: boolean;
  needsFormValidate: boolean;
}

class Formsy extends React.Component<FormsyProps, FormsyState> {
  public inputs: any[];

  public emptyArray: any[];

  public prevInputNames: any[] | null = null;

  public static displayName = 'Formsy';

  public static defaultProps: Partial<FormsyProps> = {
    disabled: false,
    getErrorMessage: () => {},
    getErrorMessages: () => {},
    getValue: () => {},
    hasValue: () => {},
    isFormDisabled: () => {},
    isFormSubmitted: () => {},
    isPristine: () => {},
    isRequired: () => {},
    isValid: () => {},
    isValidValue: () => {},
    mapping: null,
    onChange: () => {},
    onError: () => {},
    onInvalid: () => {},
    onInvalidSubmit: () => {},
    onReset: () => {},
    onSubmit: () => {},
    onValid: () => {},
    onValidSubmit: () => {},
    preventExternalInvalidation: false,
    resetValue: () => {},
    setValidations: () => {},
    setValue: () => {},
    showError: () => {},
    showRequired: () => {},
    validationErrors: null,
  };

  public static propTypes = {
    disabled: PropTypes.bool,
    getErrorMessage: PropTypes.func,
    getErrorMessages: PropTypes.func,
    getValue: PropTypes.func,
    hasValue: PropTypes.func,
    isFormDisabled: PropTypes.func,
    isFormSubmitted: PropTypes.func,
    isPristine: PropTypes.func,
    isRequired: PropTypes.func,
    isValid: PropTypes.func,
    isValidValue: PropTypes.func,
    mapping: PropTypes.func,
    onChange: PropTypes.func,
    onInvalid: PropTypes.func,
    onInvalidSubmit: PropTypes.func,
    onReset: PropTypes.func,
    onSubmit: PropTypes.func,
    onValid: PropTypes.func,
    onValidSubmit: PropTypes.func,
    preventExternalInvalidation: PropTypes.bool,
    resetValue: PropTypes.func,
    setValidations: PropTypes.func,
    setValue: PropTypes.func,
    showError: PropTypes.func,
    showRequired: PropTypes.func,
    validationErrors: PropTypes.object, // eslint-disable-line
  };

  public static childContextTypes = {
    formsy: PropTypes.object,
  };

  public constructor(props: FormsyProps) {
    super(props);
    this.state = {
      canChange: false,
      isSubmitting: false,
      isValid: true,
      needsFormValidate: false,
    };
    this.inputs = [];
    this.emptyArray = [];
  }

  public getChildContext = () => ({
    formsy: {
      attachToForm: this.attachToForm,
      detachFromForm: this.detachFromForm,
      isFormDisabled: this.isFormDisabled,
      isValidValue: (component, value) => this.runValidation(component, value).isValid,
      validate: this.validate,
    },
  });

  public componentDidMount = () => {
    this.validateForm();
  };

  public componentWillUpdate = () => {
    // Keep a reference to input names before form updates,
    // to check if inputs has changed after render
    this.prevInputNames = this.inputs.map(component => component.props.name);
  };

  public componentDidUpdate = () => {
    const { validationErrors } = this.props;

    if (validationErrors && typeof validationErrors === 'object' && Object.keys(validationErrors).length > 0) {
      this.setInputValidationErrors(validationErrors);
    }

    const newInputNames = this.inputs.map(component => component.props.name);
    if (
      this.state.needsFormValidate ||
      (this.prevInputNames && utils.arraysDiffer(this.prevInputNames, newInputNames))
    ) {
      this.validateForm();
      this.setState({ needsFormValidate: false });
    }
  };

  public getCurrentValues = () => {
    getValuesCounter++;

    const result = {};
    for (const input of this.inputs) {
      result[input.props.name] = input.state.value;
    }
    return result;

    return this.inputs.reduce((data, component) => {
      const dataCopy = typeof component.state.value === 'object' ? Object.assign({}, data) : data; // avoid param reassignment
      dataCopy[component.props.name] = component.state.value;
      return dataCopy;
    }, {});
  };

  public getModel = () => {
    const currentValues = this.getCurrentValues();
    return this.mapModel(currentValues);
  };

  public getPristineValues = () =>
    this.inputs.reduce((data, component) => {
      const { name } = component.props;
      const dataCopy = typeof component.state.value === 'object' ? Object.assign({}, data) : data; // avoid param reassignment
      dataCopy[name] = component.props.value;
      return dataCopy;
    }, {});

  public setFormPristine = (isPristine: boolean) => {
    this.setState({
      formSubmitted: !isPristine,
    });

    // Iterate through each component and set it as pristine
    // or "dirty".
    this.inputs.forEach(component => {
      component.setState({
        formSubmitted: !isPristine,
        isPristine,
      });
    });
  };

  public setInputValidationErrors = errors => {
    const { preventExternalInvalidation } = this.props;
    const { isValid } = this.state;

    this.inputs.forEach(component => {
      const { name } = component.props;
      const args = [
        {
          isValid: !(name in errors),
          validationError: typeof errors[name] === 'string' ? [errors[name]] : errors[name],
        },
      ];
      component.setState(...args);
    });
    if (!preventExternalInvalidation && isValid) {
      this.setFormValidState(false);
    }
  };

  public setFormValidState = (allIsValid: boolean) => {
    const { onValid, onInvalid } = this.props;

    this.setState({
      isValid: allIsValid,
    });

    if (allIsValid) {
      onValid();
    } else {
      onInvalid();
    }
  };

  // eslint-disable-next-line react/destructuring-assignment
  public isFormDisabled = () => this.props.disabled;

  public mapModel = (model: IModel) => {
    const { mapping } = this.props;

    if (mapping) {
      return mapping(model);
    }

    return formDataToObject.toObj(
      Object.keys(model).reduce((mappedModel, key) => {
        const keyArray = key.split('.');
        let base: IModel = mappedModel;
        while (keyArray.length) {
          const currentKey = keyArray.shift() as string;
          base[currentKey] = keyArray.length ? base[currentKey] || {} : model[key];
          base = base[currentKey];
        }
        return mappedModel;
      }, {}),
    );
  };

  public reset = (data?: IData) => {
    this.setFormPristine(true);
    this.resetModel(data);
  };

  public resetInternal = event => {
    const { onReset } = this.props;

    event.preventDefault();
    this.reset();
    if (onReset) {
      onReset();
    }
  };

  // Reset each key in the model to the original / initial / specified value
  public resetModel: IResetModel = data => {
    this.inputs.forEach(component => {
      const { name } = component.props;
      if (data && Object.prototype.hasOwnProperty.call(data, name)) {
        component.setValue(data[name]);
      } else {
        component.resetValue();
      }
    });
    this.validateForm();
  };

  // Checks validation on current value or a passed value
  public runValidation = (component: InputComponent, value = undefined, currentValues = undefined) => {
    if (value === undefined) {
      value = component.state.value;
    }

    if (!currentValues) {
      currentValues = this.getCurrentValues();
    }

    componentValidateCounter++;

    const { validationErrors } = this.props;
    const validationResults = utils.runRules(value, currentValues, component.validations, validationRules);
    const requiredResults = utils.runRules(value, currentValues, component.requiredValidations, validationRules);
    const isRequired = Object.keys(component.requiredValidations).length ? !!requiredResults.success.length : false;
    const isValid = !validationResults.failed.length && !(validationErrors && validationErrors[component.props.name]);

    return {
      isRequired,
      isValid: isRequired ? false : isValid,
      error: (() => {
        if (isValid && !isRequired) {
          return this.emptyArray;
        }

        if (validationResults.errors.length) {
          return validationResults.errors;
        }

        if (validationErrors && validationErrors[component.props.name]) {
          return typeof validationErrors[component.props.name] === 'string'
            ? [validationErrors[component.props.name]]
            : validationErrors[component.props.name];
        }

        if (isRequired) {
          const error = component.props.validationErrors[requiredResults.success[0]] || component.props.validationError;
          return error ? [error] : null;
        }

        if (validationResults.failed.length) {
          return validationResults.failed
            .map(failed =>
              component.props.validationErrors[failed]
                ? component.props.validationErrors[failed]
                : component.props.validationError,
            )
            .filter((x, pos, arr) => arr.indexOf(x) === pos); // remove duplicates
        }

        return undefined;
      })(),
    };
  };

  // Method put on each input component to register
  // itself to the form
  public attachToForm = component => {
    if (this.inputs.indexOf(component) === -1) {
      this.inputs.push(component);
    }

    this.validate(component);
  };

  // Method put on each input component to unregister
  // itself from the form
  public detachFromForm = (component: InputComponent) => {
    const componentPos = this.inputs.indexOf(component);

    if (componentPos !== -1) {
      this.inputs = this.inputs.slice(0, componentPos).concat(this.inputs.slice(componentPos + 1));
    }

    this.setState({ needsFormValidate: true });
  };

  // Checks if the values have changed from their initial value
  public isChanged = () => !utils.isSame(this.getPristineValues(), this.getCurrentValues());

  // Update model, submit to url prop and send the model
  public submit = event => {
    const { onSubmit, onValidSubmit, onInvalidSubmit } = this.props;
    const { isValid } = this.state;

    if (event && event.preventDefault) {
      event.preventDefault();
    }

    // Trigger form as not pristine.
    // If any inputs have not been touched yet this will make them dirty
    // so validation becomes visible (if based on isPristine)
    this.setFormPristine(false);
    const model = this.getModel();
    onSubmit(model, this.resetModel, this.updateInputsWithError);
    if (isValid) {
      onValidSubmit(model, this.resetModel, this.updateInputsWithError);
    } else {
      onInvalidSubmit(model, this.resetModel, this.updateInputsWithError);
    }
  };

  // Go through errors from server and grab the components
  // stored in the inputs map. Change their state to invalid
  // and set the serverError message
  public updateInputsWithError: IUpdateInputsWithError = (errors, invalidate) => {
    const { preventExternalInvalidation } = this.props;
    const { isValid } = this.state;

    Object.keys(errors).forEach(name => {
      const component = utils.find(this.inputs, input => input.props.name === name);
      if (!component) {
        throw new Error(
          `You are trying to update an input that does not exist. Verify errors object with input names. ${JSON.stringify(
            errors,
          )}`,
        );
      }
      const args = [
        {
          isValid: preventExternalInvalidation,
          externalError: typeof errors[name] === 'string' ? [errors[name]] : errors[name],
        },
      ];
      component.setState(...args);
    });
    if (invalidate && isValid) {
      this.setFormValidState(false);
    }
  };

  // Use the binded values and the actual input value to
  // validate the input and set its state. Then check the
  // state of the form itself
  public validate = (component: InputComponent) => {
    const { onChange } = this.props;
    const { canChange } = this.state;

    // Trigger onChange
    if (canChange) {
      onChange(this.getModel(), this.isChanged());
    }

    this.setState({ needsFormValidate: true });
  };

  // Validate the form by going through all child input components
  // and check their state
  public validateForm = () => {
    formValidateCounter++;

    // We need a callback as we are validating all inputs again. This will
    // run when the last component has set its state
    const onValidationComplete = () => {
      const allIsValid = this.inputs.every(component => component.state.isValid);

      this.setFormValidState(allIsValid);

      // Tell the form that it can start to trigger change events
      this.setState({
        canChange: true,
      });
    };

    const currentValues = this.getCurrentValues();

    // Run validation again in case affected by other inputs. The
    // last component validated will run the onValidationComplete callback
    this.inputs.forEach((component, index) => {
      const validation = this.runValidation(component, undefined, currentValues);
      if (validation.isValid && component.state.externalError) {
        validation.isValid = false;
      }
      component.setState(
        {
          isValid: validation.isValid,
          isRequired: validation.isRequired,
          validationError: validation.error,
          externalError: !validation.isValid && component.state.externalError ? component.state.externalError : null,
        },
        index === this.inputs.length - 1 ? onValidationComplete : null,
      );
    });

    // If there are no inputs, set state where form is ready to trigger
    // change event. New inputs might be added later
    if (!this.inputs.length) {
      this.setState({
        canChange: true,
      });
    }
  };

  public render = () => {
    const {
      /* eslint-disable @typescript-eslint/no-unused-vars */
      getErrorMessage,
      getErrorMessages,
      getValue,
      hasValue,
      isFormDisabled,
      isFormSubmitted,
      isPristine,
      isRequired,
      isValid,
      isValidValue,
      mapping,
      onChange,
      onInvalid,
      onInvalidSubmit,
      onReset,
      onSubmit,
      onValid,
      onValidSubmit,
      preventExternalInvalidation,
      resetValue,
      setValidations,
      setValue,
      showError,
      showRequired,
      validationErrors,
      /* eslint-enable @typescript-eslint/no-unused-vars */
      ...nonFormsyProps
    } = this.props;

    return React.createElement(
      'form',
      {
        onReset: this.resetInternal,
        onSubmit: this.submit,
        ...nonFormsyProps,
        disabled: false,
      },
      // eslint-disable-next-line react/destructuring-assignment
      this.props.children,
    );
  };
}

const addValidationRule = (name: string, func: ValidationFunction) => {
  validationRules[name] = func;
};

export { addValidationRule, propTypes, validationRules, Wrapper as withFormsy };

export default Formsy;
