import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OilRoute } from "@/components/oil-route";
import { Reveal } from "@/components/reveal";

// Povestea pe scurt, pe prima pagină, sub produse: cine face uleiul și de unde vine.
// Cine vrea tot, merge la „Despre noi”. Aici e momentul animat al paginii: poza se dezvelește ca o cortină,
// iar dedesubt drumul uleiului (OilRoute) se desenează din Grecia până la Galați.
export function HomeStory() {
    return (
        <section className="border-t bg-white">
            <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
                <div className="grid items-center gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14">
                    <Reveal variant="curtain" className="relative aspect-[4/3] overflow-hidden rounded-2xl md:aspect-square">
                        <Image
                            src="/despre/galerie-sticla-maslin.jpg"
                            alt="Sticlă de ulei Panos Greco în scorbura unui măslin bătrân din livada noastră"
                            fill
                            sizes="(min-width: 768px) 40vw, 100vw"
                            className="object-cover"
                        />
                    </Reveal>
                    <Reveal>
                        <p className="text-sm font-semibold text-olive">Povestea noastră</p>
                        <h2 className="mt-3 font-serif text-3xl leading-tight font-semibold text-balance text-neutral-900 sm:text-4xl lg:text-5xl">
                            Ulei grecesc, făcut de mâini românești.
                        </h2>
                        <p className="mt-5 max-w-xl text-lg leading-relaxed text-pretty text-neutral-700">
                            Acum aproape treizeci de ani, tata a plecat din Focșani spre Grecia și a ajuns producător de
                            ulei de măsline bio. Astăzi el are grijă de livadă, iar eu aduc uleiul acasă, la Galați.
                        </p>
                        <Link
                            href="/despre"
                            className="group mt-7 inline-flex items-center gap-2 font-semibold text-olive"
                        >
                            <span className="link-grow">Citește povestea noastră</span>
                            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                    </Reveal>
                </div>
                <OilRoute className="mx-auto mt-12 max-w-4xl sm:mt-16" />
            </div>
        </section>
    );
}
