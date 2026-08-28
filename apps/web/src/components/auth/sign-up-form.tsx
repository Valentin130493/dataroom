'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, type SignUpInput } from '@dataroom/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useSignUp } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/http';
import { trimmed } from '@/lib/forms';
import { Field } from './field';
import { GoogleButton } from './google-button';
import { PasswordInput } from './password-input';

export function SignUpForm() {
  const signUp = useSignUp();
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', name: '' },
  });

  const submit = form.handleSubmit((values) =>
    signUp.mutate({ ...values, name: values.name?.trim() || undefined }),
  );

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field id="name" label="Name" error={form.formState.errors.name?.message}>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Dana Scully"
            {...trimmed(form, form.register('name'))}
          />
        </Field>

        <Field id="email" label="Email" error={form.formState.errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={Boolean(form.formState.errors.email)}
            {...trimmed(form, form.register('email'))}
          />
        </Field>

        <Field
          id="password"
          label="Password"
          error={form.formState.errors.password?.message}
          hint="At least 8 characters"
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            aria-invalid={Boolean(form.formState.errors.password)}
            {...form.register('password')}
          />
        </Field>

        {signUp.error ? (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {signUp.error instanceof ApiError ? signUp.error.message : 'Could not create the account'}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={signUp.isPending}>
          {signUp.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <GoogleButton />
    </div>
  );
}
