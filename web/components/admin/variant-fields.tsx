import type { VariantValues } from "@/app/admin/produse/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
    "h-9 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus-visible:border-olive";

// Câmpurile unei mărimi: folosite la "Produs nou" și la "Adaugă mărime"
export function VariantFields({ idPrefix, values }: { idPrefix: string; values?: VariantValues }) {
    return (
        <>
            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-size`}>Mărime</Label>
                <Input
                    id={`${idPrefix}-size`}
                    name="packSize"
                    type="number"
                    min={1}
                    step={1}
                    placeholder="500"
                    defaultValue={values?.packSize ?? ""}
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-unit`}>Unitate</Label>
                <select
                    id={`${idPrefix}-unit`}
                    name="packUnit"
                    defaultValue={values?.packUnit ?? "g"}
                    className={selectClass}
                >
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                </select>
            </div>
            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-price`}>Preț (lei)</Label>
                <Input
                    id={`${idPrefix}-price`}
                    name="price"
                    inputMode="decimal"
                    placeholder="25.00"
                    defaultValue={values?.price ?? ""}
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-stock`}>Stoc</Label>
                <Input
                    id={`${idPrefix}-stock`}
                    name="stock"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={values?.stock ?? "0"}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-barcode`}>Cod de bare</Label>
                <Input
                    id={`${idPrefix}-barcode`}
                    name="barcode"
                    inputMode="numeric"
                    placeholder="opțional"
                    defaultValue={values?.barcode ?? ""}
                />
            </div>
        </>
    );
}