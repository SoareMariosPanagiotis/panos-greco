import { gql } from "@/lib/catalog";

// Datele salvate în contul clientului (migrația 018): adresele și telefonul.
// Le folosesc paginile din „Contul meu” și formularul de comandă.

// O adresă din „Adresele mele”
export type SavedAddress = {
    id: string;
    county: string;
    city: string;
    address: string;
    postalCode: string | null;
    isDefault: boolean;
};

// Câte adrese poate salva un client. Limita adevărată o păzește baza de date (save_address).
export const MAX_ADDRESSES = 10;

// Câmpurile unei adrese, scrise o singură dată pentru toate interogările
export const SAVED_ADDRESS_FIELDS = `id county city address postalCode isDefault`;

// Adresele clientului din bilet: RLS le lasă doar pe ale lui. Implicita prima, apoi cele mai noi.
const myAddressesQuery = `
  query MyAddresses {
    allCustomerAddresses(orderBy: [IS_DEFAULT_DESC, CREATED_AT_DESC]) {
      nodes { ${SAVED_ADDRESS_FIELDS} }
    }
  }
`;

export async function getMyAddresses(token: string): Promise<SavedAddress[]> {
    const data = await gql<{ allCustomerAddresses: { nodes: SavedAddress[] } }>(myAddressesQuery, {}, token);
    return data.allCustomerAddresses.nodes;
}

// Fără id = adresă nouă. Mesajele de eroare vin din funcția SQL save_address.
const saveAddressMutation = `
  mutation SaveAddress($input: SaveAddressInput!) {
    saveAddress(input: $input) { customerAddress { id } }
  }
`;

export type AddressInput = { county: string; city: string; address: string; postalCode: string };

export async function saveMyAddress(token: string, input: AddressInput, id: string | null = null) {
    await gql(
        saveAddressMutation,
        {
            input: {
                addressId: id,
                county: input.county,
                city: input.city,
                address: input.address,
                postalCode: input.postalCode || null,
            },
        },
        token,
    );
}

// „Galați, jud. Galați, 800001”
export function formatPlace(address: Pick<SavedAddress, "county" | "city" | "postalCode">) {
    const place = `${address.city}, jud. ${address.county}`;
    return address.postalCode ? `${place}, ${address.postalCode}` : place;
}

// „0722123456” → „0722 123 456”. Altfel (ex. +40…) îl lăsăm cum e.
export function formatPhone(phone: string) {
    const parts = /^(0\d{3})(\d{3})(\d{3})$/.exec(phone);
    return parts ? `${parts[1]} ${parts[2]} ${parts[3]}` : phone;
}

// „Galati” și „Galați” sunt același oraș: comparăm fără diacritice și fără litere mari,
// ca funcția place_order din baza de date
export function sameCity(a: string, b: string) {
    const plain = (text: string) =>
        text
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "");
    return plain(a) === plain(b);
}
