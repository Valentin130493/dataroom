import type {
  FieldValues,
  Path,
  PathValue,
  UseFormRegisterReturn,
  UseFormReturn,
} from 'react-hook-form';

export function trimmed<T extends FieldValues>(
  form: UseFormReturn<T>,
  registration: UseFormRegisterReturn,
): UseFormRegisterReturn {
  return {
    ...registration,
    onBlur: async (event) => {
      const target = event.target as HTMLInputElement;
      const next = target.value.trim();

      if (next !== target.value) {
        form.setValue(registration.name as Path<T>, next as PathValue<T, Path<T>>, {
          shouldValidate: form.formState.isSubmitted,
        });
      }

      return registration.onBlur(event);
    },
  };
}
