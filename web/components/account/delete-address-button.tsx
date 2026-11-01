"use client";

import { useState } from "react";
import { deleteAddress } from "@/app/cont/account-actions";

// „Șterge” cere o confirmare în pagină, fără ferestre pop-up: întâi întrebăm, apoi ștergem
export function DeleteAddressButton({ id }: { id: string }) {
    const [confirming, setConfirming] = useState(false);

    if (!confirming) {
        return (
            <button type="button" onClick={() => setConfirming(true)} className="text-red-700 hover:underline">
                Șterge
            </button>
        );
    }

    return (
        <form action={deleteAddress} className="flex items-center gap-3">
            <input type="hidden" name="id" value={id} />
            <span className="text-neutral-600">Sigur?</span>
            <button type="submit" className="font-medium text-red-700 hover:underline">
                Da, șterge
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="hover:underline">
                Nu
            </button>
        </form>
    );
}
