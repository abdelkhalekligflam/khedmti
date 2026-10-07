"use client";
import BrandMark from "@/components/brand-mark";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  LoaderCircle,
  LockKeyhole,
  Wrench,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
export default function CloudGate({
  children,
}: {
  children: (user: User | null, guest: boolean) => ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(!supabase),
    [guest, setGuest] = useState(false),
    [mode, setMode] = useState<"signin" | "signup" | "forgot" | "reset">(
      "signin",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [show, setShow] = useState(false),
    [ar, setAr] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (alive) {
          setUser(data.session?.user || null);
          setReady(true);
          if (error) setError(error.message);
        }
      })
      .catch((e) => {
        if (alive) {
          setError(String(e));
          setReady(true);
        }
      });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setReady(true);
      if (event === "PASSWORD_RECOVERY") setMode("reset");
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setMessage("");
    const f = new FormData(e.currentTarget),
      email = String(f.get("email")),
      password = String(f.get("password"));
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/?recovery=1",
        });
        if (error) throw error;
        setMessage(
          ar
            ? "إلا كان هاد البريد مسجل، غادي توصلك رسالة الاسترجاع."
            : "Si cette adresse est enregistrée, un lien de réinitialisation vous sera envoyé.",
        );
      } else if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        window.history.replaceState(null, "", window.location.pathname);
        setMode("signin");
        setMessage(
          ar ? "تبدلات كلمة السر." : "Votre mot de passe a été modifié.",
        );
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session)
          setMessage(
            ar
              ? "تأكد من البريد ديالك باش تفعل الحساب."
              : "Vérifiez votre boîte mail pour confirmer votre compte.",
          );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  if (!ready)
    return (
      <div className="auth-loading">
        <LoaderCircle className="spin" /> Khedmti
      </div>
    );
  if ((!supabase || user || guest) && mode !== "reset")
    return <>{children(user, guest)}</>;
  return (
    <div className="auth-page" dir={ar ? "rtl" : "ltr"}>
      <div className="auth-story">
        <a className="auth-brand" href="/">
          <BrandMark />
          Khedmti.
        </a>
        <div>
          <span className="auth-tag">
            <Wrench size={14} />{" "}
            {ar ? "مصمم للحرفيين" : "Pensé pour les artisans"}
          </span>
          <h1>
            {ar ? (
              "خدمتك، منظمة. نهارك، خفيف."
            ) : (
              <>
                Votre métier.
                <br />
                Notre organisation.
              </>
            )}
          </h1>
          <p>
            {ar
              ? "الزبناء، عروض الأثمنة والتدخلات فبلاصة وحدة. خدم مرتاح وخلي الإدارة علينا."
              : "Clients, devis, interventions et paiements. Un espace simple pour garder une longueur d’avance sur votre journée."}
          </p>
          <div className="auth-feature">
            <Check size={16} />
            {ar
              ? "كل المعلومات فبلاصة وحدة"
              : "Toutes vos informations au même endroit"}
          </div>
          <div className="auth-feature">
            <Check size={16} />
            {ar
              ? "ساهل فالتلفون وفالحاسوب"
              : "Aussi à l’aise sur mobile que sur ordinateur"}
          </div>
          <div className="auth-feature">
            <Check size={16} />
            {ar
              ? "خدمتك كتستاهل التنظيم"
              : "Moins de paperasse, plus de visibilité"}
          </div>
        </div>
        <span className="auth-bottom">
          Khedmti — {ar ? "شريك نهارك" : "Le compagnon de votre quotidien"}
        </span>
        <div className="auth-orbit" />
      </div>
      <div className="auth-form-side">
        <button className="auth-lang" onClick={() => setAr(!ar)}>
          {ar ? "Français" : "العربية"}
        </button>
        <div className="auth-form">
          <span className="auth-kicker">
            {ar ? "مرحبا بك" : "VOTRE ESPACE PROFESSIONNEL"}
          </span>
          <h2>
            {mode === "signup"
              ? ar
                ? "وجد الفضاء ديالك"
                : "Créez votre espace"
              : mode === "forgot"
                ? ar
                  ? "نسيتي كلمة السر؟"
                  : "Mot de passe oublié ?"
                : mode === "reset"
                  ? ar
                    ? "كلمة سر جديدة"
                    : "Un nouveau départ"
                  : ar
                    ? "مرحبا برجوعك"
                    : "Heureux de vous retrouver"}
          </h2>
          <p>
            {ar
              ? "نظم خدمتك ببساطة."
              : "Votre activité mérite un espace à sa hauteur."}
          </p>
          <form onSubmit={submit}>
            {mode !== "reset" && (
              <label>
                {ar ? "البريد الإلكتروني" : "Adresse email"}
                <input
                  autoComplete="email"
                  name="email"
                  type="email"
                  required
                  placeholder="vous@entreprise.ma"
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label>
                {ar ? "كلمة السر" : "Mot de passe"}
                <div className="password-field">
                  <input
                    name="password"
                    type={show ? "text" : "password"}
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    minLength={mode === "signin" ? 1 : 8}
                    required
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    aria-label={
                      ar ? "إظهار كلمة السر" : "Afficher le mot de passe"
                    }
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
            )}
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            {message && (
              <div className="form-success" role="status">
                {message}
              </div>
            )}
            <button className="primary" disabled={busy}>
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : mode === "signup" ? (
                ar ? (
                  "إنشاء حساب"
                ) : (
                  "Créer mon compte"
                )
              ) : mode === "forgot" ? (
                ar ? (
                  "إرسال الرابط"
                ) : (
                  "Envoyer le lien"
                )
              ) : mode === "reset" ? (
                ar ? (
                  "حفظ"
                ) : (
                  "Modifier le mot de passe"
                )
              ) : ar ? (
                "دخول"
              ) : (
                "Se connecter"
              )}
              <ArrowRight size={16} />
            </button>
          </form>
          {mode === "signin" && (
            <button
              className="text-button"
              onClick={() => {
                setMode("forgot");
                setError("");
                setMessage("");
              }}
            >
              {ar ? "نسيتي كلمة السر؟" : "Mot de passe oublié ?"}
            </button>
          )}
          <div className="auth-switch">
            <button
              onClick={() => {
                setMode(
                  mode === "signup" || mode === "forgot" ? "signin" : "signup",
                );
                setError("");
                setMessage("");
              }}
            >
              {mode === "signin"
                ? ar
                  ? "ما عندكش حساب؟ سجل هنا"
                  : "Pas encore de compte ? Créer un compte"
                : ar
                  ? "رجوع للدخول"
                  : "Revenir à la connexion"}{" "}
              <ArrowUpRight size={14} />
            </button>
          </div>
          {mode !== "reset" && (
            <button className="guest-link" onClick={() => setGuest(true)}>
              {ar ? "جرب النسخة المحلية" : "Essayer l’espace local"}{" "}
              <ArrowUpRight size={14} />
            </button>
          )}
          <div className="auth-security">
            <LockKeyhole size={13} />
            {ar
              ? "كل حساب عندو المعطيات ديالو"
              : "Un espace privé pour votre activité"}
          </div>
        </div>
      </div>
    </div>
  );
}
