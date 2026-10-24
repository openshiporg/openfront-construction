'use client';

import Link from "next/link";
import { useActionState } from "react";

import { FormFeedback, fieldLabelClass, inputClass, pillClass, selectClass, trackClass } from "@/features/platform/components/kit";
import { initialCommandState } from "@/features/platform/projects/action-state";
import { useRefreshOnSuccess } from "@/features/platform/projects/use-refresh-on-success";
import { createTradePartnerAction, updateTradePartnerAction } from "../actions";
import { partnerTypeLabel, partnerTypes } from "../lib/states";
import { keepUnlessSaved } from "@/features/lib/form-reset";

export type TradePartnerFormValues = {
  id?: string; name?: string | null; legalName?: string | null; partnerType?: string | null;
  email?: string | null; phone?: string | null; website?: string | null;
  addressLine1?: string | null; addressLine2?: string | null; city?: string | null;
  stateProvince?: string | null; postalCode?: string | null; countryCode?: string | null;
};

export function TradePartnerForm({ companyId, values = {} }: { companyId?: string; values?: TradePartnerFormValues }) {
  const editing = Boolean(values.id);
  const [state, action, pending] = useActionState(editing ? updateTradePartnerAction : createTradePartnerAction, initialCommandState);
  useRefreshOnSuccess(state.status, state);
  // A new form after each successful create, so the next partner starts blank.
  const formKey = !editing && state.status === "success" ? state.itemId : "form";

  return (
    <form key={formKey} action={action} onReset={keepUnlessSaved(state.status === "success")} className="grid min-w-0 gap-4 p-4 sm:grid-cols-2 md:p-5 xl:grid-cols-4">
      {editing ? <input type="hidden" name="id" value={values.id} /> : <input type="hidden" name="companyId" value={companyId} />}
      <label className={`${fieldLabelClass} sm:col-span-2`}>Name<input name="name" required maxLength={240} defaultValue={values.name ?? ""} className={inputClass} /></label>
      <label className={fieldLabelClass}>Type
        <select name="partnerType" defaultValue={values.partnerType ?? "subcontractor"} className={selectClass}>
          {partnerTypes.map(type => <option key={type.value} value={type.value}>{partnerTypeLabel[type.value]}</option>)}
        </select>
      </label>
      <label className={fieldLabelClass}>Legal name<input name="legalName" defaultValue={values.legalName ?? ""} className={inputClass} /></label>
      <label className={fieldLabelClass}>Email<input name="email" type="email" defaultValue={values.email ?? ""} className={inputClass} /></label>
      <label className={fieldLabelClass}>Phone<input name="phone" type="tel" defaultValue={values.phone ?? ""} className={inputClass} /></label>
      <label className={`${fieldLabelClass} sm:col-span-2`}>Website<input name="website" type="url" defaultValue={values.website ?? ""} className={inputClass} /></label>
      <label className={`${fieldLabelClass} sm:col-span-2`}>Address<input name="addressLine1" defaultValue={values.addressLine1 ?? ""} className={inputClass} /></label>
      <label className={`${fieldLabelClass} sm:col-span-2`}>Address line 2<input name="addressLine2" defaultValue={values.addressLine2 ?? ""} className={inputClass} /></label>
      <label className={fieldLabelClass}>City<input name="city" defaultValue={values.city ?? ""} className={inputClass} /></label>
      <label className={fieldLabelClass}>State / province<input name="stateProvince" defaultValue={values.stateProvince ?? ""} className={inputClass} /></label>
      <label className={fieldLabelClass}>Postal code<input name="postalCode" defaultValue={values.postalCode ?? ""} className={inputClass} /></label>
      <label className={fieldLabelClass}>Country<input name="countryCode" maxLength={2} defaultValue={values.countryCode ?? "US"} className={`${inputClass} font-mono uppercase`} /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 xl:col-span-4">
        <span className={trackClass}><button disabled={pending} className={pillClass("primary")}>{pending ? "Saving…" : editing ? "Save changes" : "Add trade partner"}</button></span>
        <FormFeedback status={state.status} message={state.message} />
        {!editing && state.status === "success" && state.itemId ? <Link href={`/dashboard/platform/trade-partners/${encodeURIComponent(state.itemId)}`} className="text-sm font-medium underline underline-offset-4">Open</Link> : null}
      </div>
    </form>
  );
}
