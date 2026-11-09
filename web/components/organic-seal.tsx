import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Leaf } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Sigla bio a UE, sub numele produsului. Regulile vin din Regulamentul (UE) 2018/848:
// - art. 33: sigla se poate folosi și în prezentarea și reclama produselor certificate, deci și pe site;
// - art. 32: unde apare sigla, în același câmp vizual apar codul organismului de control și locul unde
//   s-a cultivat materia primă („Agricultură UE” sau, dacă toată vine dintr-o țară, numele țării);
// - anexa V: sigla nu se modifică (o punem întreagă, 3 : 2, fără colțuri rotunjite) și are cel puțin
//   9 × 13,5 mm, cam 34 × 51 px pe ecran. Noi o afișăm la 40 × 60 px.
// De aceea sigla apare doar când în admin sunt completate și codul, și țara; altfel rămâne eticheta „BIO”.
// Țara de origine ține loc de locul cultivării: la uleiul nostru sunt același lucru (Messinia, Grecia).
// Pentru un produs bio făcut din materii prime cultivate în altă țară ar trebui un câmp separat.

type Props = {
    isOrganic: boolean;
    organicCode: string | null;
    origin: string | null;
    // Pagina cu certificatul, doar la produsele pe care le acoperă (lib/organic-certificate.ts)
    certificateHref?: string;
};

const box = "mt-4 inline-flex items-center gap-3 rounded-xl border bg-white py-2.5 pl-2.5";

export function OrganicSeal({ isOrganic, organicCode, origin, certificateHref }: Props) {
    if (!isOrganic) return null;
    if (!organicCode || !origin) {
        return (
            <Badge className="mt-3 bg-green-700 text-white">
                <Leaf />
                BIO
            </Badge>
        );
    }

    const seal = (
        <>
            <Image
                src="/bio/sigla-bio-ue.png"
                alt="Logoul de producție ecologică al Uniunii Europene"
                width={60}
                height={40}
                className="h-10 w-15 shrink-0"
            />
            <span className="text-sm leading-tight">
                <span className="block font-semibold text-neutral-900">Produs bio certificat</span>
                <span className="mt-1 block text-xs text-neutral-600">
                    <span className="font-medium tracking-wide text-neutral-800">{organicCode}</span>
                    {` · Agricultură ${origin}`}
                </span>
                {certificateHref && (
                    <span className="mt-1 block text-xs font-medium text-olive group-hover:underline">
                        Vezi certificatul
                    </span>
                )}
            </span>
        </>
    );

    // Cu certificat, toată caseta e un link: ținta e mare și pe telefon
    if (certificateHref) {
        return (
            <Link href={certificateHref} className={`group ${box} pr-3 transition-colors hover:border-olive/50`}>
                {seal}
                <ChevronRight className="size-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
            </Link>
        );
    }
    return <div className={`${box} pr-4`}>{seal}</div>;
}
