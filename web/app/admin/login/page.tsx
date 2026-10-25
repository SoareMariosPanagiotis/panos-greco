import { LoginForm } from "@/components/login-form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
    return (
        <main className="flex flex-1 items-center justify-center px-4 py-16">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Administrare</CardTitle>
                    <CardDescription>Intră în contul de administrator Panos Greco.</CardDescription>
                </CardHeader>
                <CardContent>
                    <LoginForm />
                </CardContent>
            </Card>
        </main>
    );
}