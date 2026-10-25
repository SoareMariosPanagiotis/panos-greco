import { Suspense } from "react";

type Variant = {
    id: string;
    packSize: number;
    packUnit: string;
    price: string;
};

type Product = {
    id: string;
    name: string;
    isOrganic: boolean;
    productVariantsByProductId: { nodes: Variant[] };
};

const query = `
  {
    allProducts {
      nodes {
        id
        name
        isOrganic
        productVariantsByProductId(orderBy: PACK_SIZE_ASC) {
          nodes { id packSize packUnit price }
        }
      }
    }
  }
`;

function formatSize(size: number, unit: string) {
    if (size >= 1000 && unit === "ml") return `${size / 1000} l`;
    if (size >= 1000 && unit === "g") return `${size / 1000} kg`;
    return `${size} ${unit}`;
}

async function ProductList() {
    const res = await fetch("http://localhost:5000/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
    });
    const { data } = await res.json();
    const products: Product[] = data.allProducts.nodes;

    return (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
                <div key={product.id} className="rounded-xl border border-neutral-700 p-6">
                    <div className="flex items-start justify-between gap-4">
                        <h2 className="text-xl font-semibold">{product.name}</h2>
                        {product.isOrganic && (
                            <span className="rounded-full bg-green-700 px-3 py-1 text-xs font-semibold">
                BIO
              </span>
                        )}
                    </div>
                    <ul className="mt-4 divide-y divide-neutral-800">
                        {product.productVariantsByProductId.nodes.map((variant) => (
                            <li key={variant.id} className="flex justify-between py-2">
                                <span>{formatSize(variant.packSize, variant.packUnit)}</span>
                                <span className="font-medium">{variant.price} lei</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}

export default function Home() {
    return (
        <main className="p-8">
            <h1 className="text-3xl font-bold">Panos Greco</h1>
            <Suspense fallback={<p className="mt-6">Se încarcă produsele...</p>}>
                <ProductList />
            </Suspense>
        </main>
    );
}