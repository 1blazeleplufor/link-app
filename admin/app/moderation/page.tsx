import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/supabase";

// Moderation queue: public outings waiting for review + open reports. Decisions go through moderate_outing(),
// which re-checks the staff role server-side and writes the audit log.
export default async function Moderation() {
  const { db, user, allowed } = await requireStaff("moderator");
  if (!user) return <p>Connexion requise.</p>;
  if (!allowed) return <p>Accès réservé aux modérateurs.</p>;

  const [{ data: outings }, { data: reports }] = await Promise.all([
    db.from("outings").select("id, title, city_id, category_id, starts_at, description, created_at").eq("kind", "public").eq("status", "pending_review").order("created_at"),
    db.from("reports").select("id, target_type, target_id, reason, details, created_at").eq("status", "open").order("created_at"),
  ]);

  async function decide(formData: FormData) {
    "use server";
    const { db: s, allowed: ok } = await requireStaff("moderator");
    if (!ok) return;
    await s.rpc("moderate_outing", { p_outing: String(formData.get("id")), p_approve: formData.get("approve") === "1", p_reason: String(formData.get("reason") ?? "") });
    revalidatePath("/moderation");
  }

  return (
    <>
      <h1>Sorties à valider ({outings?.length ?? 0})</h1>
      {(outings ?? []).map(o => (
        <form key={o.id} action={decide} style={{ border: "1px solid #F1D9CA", borderRadius: 12, padding: 14, marginBottom: 12, background: "#fff" }}>
          <input type="hidden" name="id" value={o.id} />
          <strong>{o.title}</strong> — {o.city_id} · {o.category_id} · {new Date(o.starts_at).toLocaleString("fr-FR")}
          <p>{o.description}</p>
          <input name="reason" placeholder="Motif (obligatoire en cas de refus)" style={{ width: "60%" }} />{" "}
          <button name="approve" value="1">Valider</button>{" "}
          <button name="approve" value="0">Refuser</button>
        </form>
      ))}
      <h1 id="reports">Signalements ouverts ({reports?.length ?? 0})</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th align="left">Type</th><th align="left">Cible</th><th align="left">Motif</th><th align="left">Date</th></tr></thead>
        <tbody>{(reports ?? []).map(r => <tr key={r.id}><td>{r.target_type}</td><td><code>{r.target_id}</code></td><td>{r.reason}</td><td>{new Date(r.created_at).toLocaleString("fr-FR")}</td></tr>)}</tbody>
      </table>
    </>
  );
}
