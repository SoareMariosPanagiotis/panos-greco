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
  productVariantsByProductId: { nodes: Variant[] };
};

const query = `
  {
    allProducts {
      nodes {
        id
        name
        productVariantsByProductId(orderBy: PACK_SIZE_ASC) {
          nodes { id packSize packUnit price }
        }
      }
    }
  }
`;

async function ProductList() {
  const res = await fetch("http://localhost:5000/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const { data } = await res.json();
  const products: Product[] = data.allProducts.nodes;

  return (
      <ul className="mt-6 space-y-6">
        {products.map((product) => (
            <li key={product.id}>
              <h2 className="text-xl font-semibold">{product.name}</h2>
              <ul className="mt-2">
                {product.productVariantsByProductId.nodes.map((variant) => (
                    <li key={variant.id}>
                      {variant.packSize} {variant.packUnit}: {variant.price} lei
                    </li>
                ))}
              </ul>
            </li>
        ))}
      </ul>
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