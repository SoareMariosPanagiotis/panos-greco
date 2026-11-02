"use client";

import { useActionState } from "react";
import Link from "next/link";
import { continueAuth, type AuthState, type AuthStep } from "@/app/cont/actions";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

const initialState: AuthState = {
    step: "email",
    email: "",
    error: null,
    firstName: "",
    lastName: "",
    acceptTerms: false,
};

// Titlul și explicația se schimbă de la un pas la altul
const headings: Record<AuthStep, { title: string; description: string }> = {
    email: {
        title: "Intră în cont",
        description: "Scrie adresa de email. Dacă nu ai cont, îți facem unul în pasul următor.",
    },
    password: {
        title: "Bine ai revenit!",
        description: "Ai deja cont cu acest email. Scrie parola ca să intri.",
    },
    register: {
        title: "Creează cont",
        description: "Nu avem încă un cont cu acest email. Completează datele de mai jos.",
    },
};

type StepProps = {
    state: AuthState;
    formAction: (formData: FormData) => void;
    pending: boolean;
};

function ErrorMessage({ error }: { error: string | null }) {
    if (!error) return null;
    return (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
        </p>
    );
}

// Pasul 1: doar emailul
function EmailStep({ state, formAction, pending }: StepProps) {
    return (
        <form action={formAction} className="space-y-4">
            <input type="hidden" name="intent" value="check-email" />
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    defaultValue={state.email}
                    autoFocus
                    required
                />
            </div>

            <ErrorMessage error={state.error} />

            <Button type="submit" disabled={pending} className="w-full bg-olive hover:bg-olive/90">
                {pending ? "Se verifică..." : "Continuă"}
            </Button>
        </form>
    );
}

// Emailul ales, cu butonul „Schimbă”. E un formular separat,
// ca tasta Enter din câmpul de parolă să trimită formularul principal.
function ChosenEmail({ state, formAction, pending }: StepProps) {
    return (
        <form
            action={formAction}
            className="flex items-center justify-between gap-3 rounded-lg bg-olive-light px-3 py-2 text-sm"
        >
            <input type="hidden" name="intent" value="change-email" />
            <input type="hidden" name="email" value={state.email} />
            <span className="truncate font-medium">{state.email}</span>
            <button
                type="submit"
                disabled={pending}
                className="shrink-0 font-medium text-olive hover:underline"
            >
                Schimbă
            </button>
        </form>
    );
}

// Pasul 2a: are deja cont → parola
function PasswordStep({ state, formAction, pending }: StepProps) {
    return (
        <form action={formAction} className="space-y-4">
            <input type="hidden" name="intent" value="login" />
            {/* Emailul ascuns: merge mai departe la server și ajută managerul de parole */}
            <input type="email" name="email" autoComplete="username" value={state.email} readOnly hidden />

            <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="password">Parolă</Label>
                    <Link
                        // Emailul merge mai departe, ca să nu-l mai scrie o dată
                        href={`/cont/parola-uitata?email=${encodeURIComponent(state.email)}`}
                        className="text-sm text-olive hover:underline"
                    >
                        Ai uitat parola?
                    </Link>
                </div>
                <PasswordInput
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    autoFocus
                    required
                />
            </div>

            <ErrorMessage error={state.error} />

            <Button type="submit" disabled={pending} className="w-full bg-olive hover:bg-olive/90">
                {pending ? "Se verifică..." : "Intră în cont"}
            </Button>
        </form>
    );
}

// Pasul 2b: cont nou
function RegisterStep({ state, formAction, pending }: StepProps) {
    return (
        <form action={formAction} className="space-y-4">
            <input type="hidden" name="intent" value="register" />
            <input type="email" name="email" autoComplete="username" value={state.email} readOnly hidden />
            {/* Capcană pentru roboți: oamenii nu văd câmpul, roboții îl completează */}
            <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
            />

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="lastName">Nume</Label>
                    <Input
                        id="lastName"
                        name="lastName"
                        autoComplete="family-name"
                        defaultValue={state.lastName}
                        maxLength={50}
                        autoFocus
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="firstName">Prenume</Label>
                    <Input
                        id="firstName"
                        name="firstName"
                        autoComplete="given-name"
                        defaultValue={state.firstName}
                        maxLength={50}
                        required
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Parolă</Label>
                <PasswordInput
                    id="password"
                    name="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    aria-describedby="password-hint"
                    required
                />
                <p id="password-hint" className="text-xs text-neutral-500">
                    Cel puțin 8 caractere.
                </p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="passwordRepeat">Repetă parola</Label>
                <PasswordInput
                    id="passwordRepeat"
                    name="passwordRepeat"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    required
                />
            </div>

            <label className="flex items-start gap-2 text-sm">
                <input
                    type="checkbox"
                    name="acceptTerms"
                    defaultChecked={state.acceptTerms}
                    required
                    className="mt-0.5 size-4 accent-olive"
                />
                <span>
                    Am citit și accept{" "}
                    <Link href="/termeni" className="text-olive underline">
                        termenii și condițiile
                    </Link>{" "}
                    și{" "}
                    <Link href="/confidentialitate" className="text-olive underline">
                        politica de confidențialitate
                    </Link>
                    .
                </span>
            </label>

            <ErrorMessage error={state.error} />

            <Button type="submit" disabled={pending} className="w-full bg-olive hover:bg-olive/90">
                {pending ? "Se creează contul..." : "Creează cont"}
            </Button>
        </form>
    );
}

export function AuthForm() {
    const [state, formAction, pending] = useActionState(continueAuth, initialState);
    const heading = headings[state.step];
    const props = { state, formAction, pending };

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="text-2xl">{heading.title}</CardTitle>
                <CardDescription>{heading.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {state.step !== "email" && <ChosenEmail {...props} />}
                {state.step === "email" && <EmailStep {...props} />}
                {state.step === "password" && <PasswordStep {...props} />}
                {state.step === "register" && <RegisterStep {...props} />}
            </CardContent>
        </Card>
    );
}
