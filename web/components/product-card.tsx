import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type Variant = {
    id: string;
    packSize: number;
    packUnit: string;
    price: string;
};

export type Product = {
    id: string;
    name: string;
    isOrganic: boolean;
    productVariantsByProductId: { nodes: Variant[] };
};

function formatSize(size: number, unit: string) {
    if (size >= 1000 && unit === "ml") return `${size / 1000} l`;
    if (size >= 1000 && unit === "g") return `${size / 1000} kg`;
    return `${size} ${unit}`;
}

export function ProductCard({ product }: { product: Product }) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-xl">{product.name}</CardTitle>
                    {product.isOrganic && (
                        <Badge className="bg-green-700 text-white">BIO</Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <ul className="divide-y">
                    {product.productVariantsByProductId.nodes.map((variant) => (
                        <li key={variant.id} className="flex justify-between py-2">
                            <span>{formatSize(variant.packSize, variant.packUnit)}</span>
                            <span className="font-medium">{variant.price} lei</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}