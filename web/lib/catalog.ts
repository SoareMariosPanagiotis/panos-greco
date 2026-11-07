const API_URL = "http://localhost:5050/graphql"; // portul de pe calculator; în container API-ul ascultă tot pe 5000

// Trimite o interogare GraphQL la API și întoarce datele.
// Dacă primește un bilet (token), îl pune în header-ul Authorization.
export async function gql<T>(
    query: string,
    variables: Record<string, unknown> = {},
    token?: string,
): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors) {
        throw new Error(json.errors[0].message);
    }
    return json.data as T;
}

export type Variant = {
    id: string;
    packSize: number;
    packUnit: string;
    price: string;
};

export type ProductTileData = {
    id: string;
    name: string;
    slug: string;
    isOrganic: boolean;
    imageUrl: string | null;
    cheapest: { totalCount: number; nodes: { price: string }[] };
};

export type ProductDetails = {
    name: string;
    description: string | null;
    isOrganic: boolean;
    categoryByCategoryId: { name: string } | null;
    productVariantsByProductId: { nodes: Variant[] };
};

export function formatSize(size: number, unit: string) {
    if (size >= 1000 && unit === "ml") return `${size / 1000} l`;
    if (size >= 1000 && unit === "g") return `${size / 1000} kg`;
    return `${size} ${unit}`;
}

export function formatPrice(price: string) {
    return `${Number(price).toLocaleString("ro-RO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} lei`;
}