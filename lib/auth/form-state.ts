/**
 * Shared shape for `useActionState` forms. Kept out of the "use server" module
 * because those files may only export async functions.
 */
export interface FormState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<Record<string, string>>;
}

export const idleFormState: FormState = { status: "idle", message: "" };
