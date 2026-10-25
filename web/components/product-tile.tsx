import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatPrice, type ProductTileData } from "@/lib/catalog";

export function ProductTile({ product }: { product: ProductTileData }) {
    const cheapest = product.cheapest.nodes[0];
    const sizes = product.cheapest.totalCount;

    return (
        <Link
            href={`/produse/${product.slug}`}
            className="group flex flex-col overflow-hidden rounded-xl border bg-white transition hover:shadow-lg"
        >
            <div className="relative aspect-square bg-olive-light">
                {product.imageUrl ? (
                    <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="object-cover"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-6xl font-bold text-olive/30">
                        {product.name[0]}
                    </div>
                )}
                {product.isOrganic && (
                    <Badge className="absolute left-3 top-3 bg-green-700 text-white">BIO</Badge>
                )}
            </div>
            <div className="flex flex-1 flex-col p-4">
                <h2 className="font-medium leading-snug group-hover:text-olive">{product.name}</h2>
                {sizes > 1 && <p className="mt-1 text-sm text-neutral-500">{sizes} mărimi</p>}
                <p className="mt-auto pt-3 text-lg font-bold">
                    {sizes > 1 && <span className="text-sm font-normal text-neutral-500">de la </span>}
                    {cheapest ? formatPrice(cheapest.price) : "—"}
                </p>
            </div>
        </Link>
    );
}