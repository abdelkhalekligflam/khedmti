"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { initial, validData, type Data } from "./model";
import { supabase } from "./supabase";
export function useWorkspace(userId?: string) {
  const [data, setData] = useState<Data>(initial),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [dirty, setDirty] = useState(false),
    [loaded, setLoaded] = useState(false);
  const revision = useRef<number | null>(null),
    savingRef = useRef(false),
    latest = useRef(data),
    owner = useRef(userId);
  owner.current = userId;
  latest.current = data;
  const key = userId ? `khedmti-user-${userId}` : "khedmti-v1";
  const load = useCallback(
    async (discardLocal = false) => {
      setError("");
      setReady(false);
      setLoaded(false);
      try {
        let local: Data | null = null;
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (validData(parsed)) local = parsed;
        }
        if (supabase && userId) {
          const { data: row, error } = await supabase
            .from("khedmti_workspaces")
            .select("payload,revision")
            .eq("user_id", userId)
            .maybeSingle();
          if (error) throw error;
          revision.current = row?.revision ?? null;
          const meta = JSON.parse(
            localStorage.getItem(key + "-meta") || "null",
          ) as { revision: number | null; dirty: boolean } | null;
          if (row) {
            if (!validData(row.payload))
              throw new Error("Données cloud invalides.");
            if (local && meta?.dirty && !discardLocal) {
              setData(local);
              setDirty(true);
              if (meta.revision !== row.revision) {
                revision.current = meta.revision;
                setError(
                  "Une autre session a modifié le cloud. Votre brouillon local est conservé. Exportez-le, puis rechargez le cloud.",
                );
              }
            } else {
              setData(row.payload);
              setDirty(false);
            }
          } else {
            setData(discardLocal ? initial : local || initial);
            setDirty(!discardLocal && !!local);
          }
        } else {
          setData(local || initial);
          setDirty(false);
        }
        setLoaded(true);
      } catch (e) {
        setError(
          e && typeof e === "object" && "message" in e
            ? String(e.message)
            : "Impossible de charger votre espace.",
        );
      } finally {
        setReady(true);
      }
    },
    [key, userId],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!ready || !loaded) return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(
        key + "-meta",
        JSON.stringify({ revision: revision.current, dirty }),
      );
    } catch {
      setError("Sauvegarde locale impossible. Exportez vos données.");
    }
  }, [data, key, ready, loaded, dirty]);
  const update: typeof setData = useCallback((next) => {
    setData((prev) => (typeof next === "function" ? next(prev) : next));
    setDirty(true);
  }, []);
  async function save() {
    if (!supabase || !userId || !loaded || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    const snapshot = latest.current;
    const id = userId;
    try {
      const result =
        revision.current === null
          ? await supabase
              .from("khedmti_workspaces")
              .insert({ user_id: id, payload: snapshot, revision: 1 })
              .select("revision")
              .single()
          : await supabase
              .from("khedmti_workspaces")
              .update({
                payload: snapshot,
                revision: revision.current + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", id)
              .eq("revision", revision.current)
              .select("revision")
              .maybeSingle();
      if (result.error) throw result.error;
      if (!result.data)
        throw new Error(
          "Une autre session a modifié vos données. Exportez votre sauvegarde, puis rechargez le cloud.",
        );
      if (owner.current !== id) return;
      revision.current = result.data.revision;
      localStorage.setItem(
        key + "-meta",
        JSON.stringify({
          revision: revision.current,
          dirty: latest.current !== snapshot,
        }),
      );
      if (latest.current === snapshot) setDirty(false);
    } catch (e) {
      if (owner.current === id)
        setError(
          e && typeof e === "object" && "message" in e
            ? String(e.message)
            : "Échec de la sauvegarde cloud.",
        );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  return {
    data,
    setData: update,
    ready,
    error,
    saving,
    dirty,
    loaded,
    save,
    load,
  };
}
