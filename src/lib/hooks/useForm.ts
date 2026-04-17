"use client";

import { useState, useCallback } from "react";
import { ValidationRule } from "../utils/validations";

interface FormRules {
  [key: string]: ValidationRule[];
}

interface UseFormProps<T> {
  initialValues: T;
  rules?: FormRules;
}

export const useForm = <T extends Record<string, any>>({ initialValues, rules = {} }: UseFormProps<T>) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<{ [K in keyof T]?: string }>({});

  const validateField = useCallback((name: keyof T, value: any) => {
    const fieldRules = rules[name as string];
    if (!fieldRules) return "";

    for (const rule of fieldRules) {
      const result = rule(value);
      if (result !== true) return result;
    }
    return "";
  }, [rules]);

  const handleChange = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField]);

  const handleSubmit = (callback: (data: T) => void) => (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const newErrors: { [K in keyof T]?: string } = {};
    let hasErrors = false;

    Object.keys(values).forEach(key => {
      const error = validateField(key, values[key]);
      if (error) {
        newErrors[key as keyof T] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);

    if (!hasErrors) {
      callback(values);
    }
  };

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  return {
    values,
    errors,
    handleChange,
    handleSubmit,
    resetForm,
    setValues,
    setErrors
  };
};
