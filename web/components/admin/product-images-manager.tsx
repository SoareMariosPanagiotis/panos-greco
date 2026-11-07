"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import {
    deleteProductImage,
    makeProductImageMain,
    updateProductImageAlt,
    type ImageActionState,
} from "@/app/admin/produse/image-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { imageSrc, type ProductImage } from "@/lib/product-images";

const initialState: ImageActionState = { status: "idle", message: "" };
const MAX_IMAGES = 12; // aceeași limită ca în baza de date (migrația 032)

type CardProps = { image: ProductImage; isMain: boolean; productName: string };

// O poză din galerie: descrierea ei, „fă-o principală” și ștergerea
function ImageCard({ image, isMain, productName }: CardProps) {
    const [deleteState, deleteAction, deleting] = useActionState(deleteProductImage, initialState);
    const [mainState, mainAction, makingMain] = useActionState(makeProductImageMain, initialState);
    const [altState, altAction, savingAlt] = useActionState(updateProductImageAlt, initialState);
    const error = [deleteState, mainState, altState].find((state) => state.status === "error")?.message;

    return (
        <li className="overflow-hidden rounded-xl border bg-white">
            <div className="relative aspect-square bg-olive-light">
                <Image
                    src={imageSrc(image.id)}
                    alt={image.alt ?? productName}
                    fill
                    sizes="(min-width: 1024px) 220px, (min-width: 640px) 33vw, 50vw"
                    className="object-cover"
                />
                {isMain && (
                    <span className="absolute top-2 left-2 rounded-full bg-olive px-2 py-0.5 text-xs font-medium text-white">
                        Principală
                    </span>
                )}
            </div>
            <div className="space-y-2 p-3">
                {/* Descrierea pozei: o citesc Google și cititoarele de ecran */}
                <form action={altAction} className="flex gap-2">
                    <input type="hidden" name="id" value={image.id} />
                    <Input
                        name="alt"
                        defaultValue={image.alt ?? ""}
                        maxLength={200}
                        placeholder="Ce se vede în poză"
                        aria-label="Descrierea pozei"
                        className="h-8 text-sm"
                    />
                    <Button type="submit" size="sm" variant="outline" disabled={savingAlt}>
                        {altState.status === "saved" && !savingAlt ? "✓" : "OK"}
                    </Button>
                </form>
                <div className="flex items-center gap-2">
                    {!isMain && (
                        <form action={mainAction}>
                            <input type="hidden" name="id" value={image.id} />
                            <Button type="submit" size="sm" variant="outline" disabled={makingMain}>
                                <Star /> Principală
                            </Button>
                        </form>
                    )}
                    <form
                        action={deleteAction}
                        onSubmit={(event) => {
                            if (!window.confirm("Ștergi poza? Nu se poate anula.")) event.preventDefault();
                        }}
                        className="ml-auto"
                    >
                        <input type="hidden" name="id" value={image.id} />
                        <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            disabled={deleting}
                            aria-label="Șterge poza"
                            className="text-red-700 hover:bg-red-50 hover:text-red-800"
                        >
                            <Trash2 />
                        </Button>
                    </form>
                </div>
                {error && (
                    <p role="alert" className="text-xs text-red-700">
                        {error}
                    </p>
                )}
            </div>
        </li>
    );
}

type Props = { productId: string; productName: string; images: ProductImage[] };

// Galeria unui produs, în admin. Pozele se trimit pe rând la /admin/produse/imagini
// (o rută, nu un Server Action, pentru că un fișier de câțiva MB trece de limita de 1 MB a acțiunilor).
export function ProductImagesManager({ productId, productName, images }: Props) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState("");
    const [problems, setProblems] = useState<string[]>([]);
    const full = images.length >= MAX_IMAGES;

    async function upload(files: File[]) {
        setBusy(true);
        setProblems([]);
        const found: string[] = [];

        // Pe rând, nu toate deodată: serverul micșorează fiecare poză, iar ordinea rămâne cea aleasă
        for (const [index, file] of files.entries()) {
            setProgress(`Se încarcă poza ${index + 1} din ${files.length}...`);
            const body = new FormData();
            body.append("productId", productId);
            body.append("file", file);
            try {
                const response = await fetch("/admin/produse/imagini", { method: "POST", body });
                const result = (await response.json()) as { ok: boolean; message: string };
                if (!result.ok) found.push(`${file.name}: ${result.message}`);
            } catch {
                found.push(`${file.name}: nu am putut trimite poza. Verifică internetul.`);
            }
        }

        setProblems(found);
        setProgress("");
        setBusy(false);
        if (inputRef.current) inputRef.current.value = ""; // ca aceeași poză să poată fi aleasă din nou
        router.refresh(); // cere pagina din nou de la server, cu pozele noi
    }

    return (
        <div className="rounded-xl border bg-white p-4 sm:p-6">
            <p className="text-sm text-neutral-600">
                Prima poză e cea principală: apare pe carduri și prima pe pagina produsului. Arată cel mai
                bine pătrată, pe fundal simplu. Poți alege mai multe poze deodată (cel mult {MAX_IMAGES}).
            </p>

            {images.length > 0 ? (
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {images.map((image, index) => (
                        <ImageCard key={image.id} image={image} isMain={index === 0} productName={productName} />
                    ))}
                </ul>
            ) : (
                <p className="mt-4 rounded-lg border border-dashed p-6 text-center text-sm text-neutral-500">
                    Produsul nu are încă poze. Pe site apare doar prima literă din nume.
                </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
                {/* Inputul de fișiere e ascuns; îl deschide butonul de mai jos */}
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    onChange={(event) => {
                        const files = Array.from(event.target.files ?? []).slice(0, MAX_IMAGES - images.length);
                        if (files.length > 0) void upload(files);
                    }}
                />
                <Button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={busy || full}
                    className="bg-olive text-white hover:bg-olive/90"
                >
                    <ImagePlus /> Adaugă poze
                </Button>
                {progress && (
                    <span role="status" className="text-sm text-neutral-600">
                        {progress}
                    </span>
                )}
                {full && <span className="text-sm text-neutral-500">Ai ajuns la {MAX_IMAGES} poze.</span>}
            </div>

            {problems.length > 0 && (
                <ul role="alert" className="mt-3 space-y-1 text-sm text-red-700">
                    {problems.map((problem) => (
                        <li key={problem}>{problem}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
