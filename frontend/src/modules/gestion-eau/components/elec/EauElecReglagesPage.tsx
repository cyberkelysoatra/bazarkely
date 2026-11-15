/**
 * Réglages RTB Énergie /gestion-eau/elec/reglages (ELEC-CC-02), sur le modèle de
 * EauConfigPage : identité, règlement, désignation, calcul, numérotation. Écriture :
 * admin et gestion électricité ; lecture seule réelle pour promoteur et lecture.
 * Aucune valeur d'identité ni bancaire n'est connue du code (saisie par RTB).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Building2, Landmark, FileText, Calculator, Hash, Save, ChevronDown, Euro } from 'lucide-react';
import EauPageShell from '../EauPageShell';
import { AideChamp, ElecBouton, LectureSeule, champCls, useDonneesElec } from './ElecUi';
import { aujourdhuiMg, etatCoursBcm } from '../../utils/elecFacture';
import { saveReglages, REGLAGES_DEFAUT } from '../../services/eauElecService';
import { controlerReglages, formaterIban, numeroFacture, type ErreursReglages } from '../../utils/elecReglages';
import { cycleParDefaut } from '../../utils/elecReleves';
import { showConfirm } from '../../../../utils/dialogUtils';
import type { ElecReglagesLocal } from '../../types/gestionEau';

type Champ = { cle: keyof ElecReglagesLocal; libelle: string; aide?: string; mode?: 'text' | 'decimal' | 'numeric' | 'email' | 'tel' };

const IDENTITE: Champ[] = [
  { cle: 'raison_sociale', libelle: 'Raison sociale' },
  { cle: 'forme_juridique', libelle: 'Forme juridique' },
  { cle: 'siege', libelle: 'Siège' },
  { cle: 'nif', libelle: 'NIF', aide: 'Chiffres seulement', mode: 'numeric' },
  { cle: 'stat', libelle: 'STAT', aide: 'Chiffres seulement', mode: 'numeric' },
  { cle: 'rcs', libelle: 'RCS' },
  { cle: 'telephone', libelle: 'Téléphone', mode: 'tel' },
  { cle: 'email', libelle: 'E-mail', mode: 'email' },
];
const REGLEMENT: Champ[] = [
  { cle: 'banque', libelle: 'Banque' },
  { cle: 'titulaire_compte', libelle: 'Titulaire du compte' },
  { cle: 'iban', libelle: 'IBAN', aide: 'Format MG, 27 caractères (espaces acceptés)' },
  { cle: 'bic', libelle: 'BIC', aide: '8 ou 11 caractères' },
];
const DESIGNATION: Champ[] = [
  { cle: 'site', libelle: 'Site' },
  { cle: 'puissance_kwc', libelle: 'Puissance (kWc)', mode: 'decimal' },
  { cle: 'contrat_ref', libelle: 'Référence du contrat de vente d’énergie' },
];
const CALCUL: Champ[] = [
  { cle: 'tarif_kwh', libelle: 'Tarif (Ar par kWh)', mode: 'decimal' },
  { cle: 'forfait_ht', libelle: 'Forfait d’amortissement (Ar HT par facture et par mois)', mode: 'decimal' },
  { cle: 'tva_pct', libelle: 'TVA (%)', mode: 'decimal' },
  { cle: 'echeance_jours', libelle: 'Échéance (jours)', mode: 'numeric' },
  { cle: 'devise', libelle: 'Devise' },
];
const NUMEROTATION: Champ[] = [
  { cle: 'numero_annee', libelle: 'Année de numérotation', mode: 'numeric' },
  { cle: 'numero_prochain', libelle: 'Prochain numéro officiel', mode: 'numeric' },
  { cle: 'numero_essai_prochain', libelle: 'Prochain numéro d’essai', aide: 'Compteur à part : jamais mélangé avec l’officiel', mode: 'numeric' },
];
// Cours de référence BCM (ELEC-CC-04) : rendu à part (une phrase), enregistré comme les autres.
const BCM: Champ[] = [
  { cle: 'cours_bcm', libelle: 'Cours de référence BCM (Ar pour 1 €)', mode: 'decimal' },
  { cle: 'date_cours_bcm', libelle: 'Date du cours' },
];
const TOUS = [...IDENTITE, ...REGLEMENT, ...DESIGNATION, ...CALCUL, ...NUMEROTATION, ...BCM];
const NUMERIQUES = new Set<string>(['puissance_kwc', 'tarif_kwh', 'forfait_ht', 'tva_pct', 'echeance_jours', 'numero_annee', 'numero_prochain', 'numero_essai_prochain', 'cours_bcm']);

/** Contrôle du cours BCM : nombre positif à 2 décimales au plus, date connue et pas dans le futur. */
export function controlerCoursBcm(cours: string, date: string, aujourdhui: string): { cours_bcm?: string; date_cours_bcm?: string } {
  const e: { cours_bcm?: string; date_cours_bcm?: string } = {};
  const c = cours.trim().replace(/\s+/g, '').replace(',', '.');
  const d = date.trim();
  if (c === '' && d === '') return e;
  const n = Number(c);
  if (c === '' || !Number.isFinite(n) || n <= 0 || !/^\d+(\.\d{1,2})?$/.test(c)) e.cours_bcm = 'Cours : nombre positif, 2 décimales au plus';
  if (d === '') e.date_cours_bcm = 'Date du cours attendue';
  else if (d > aujourdhui) e.date_cours_bcm = 'La date du cours ne peut pas être dans le futur';
  return e;
}

function versFormulaire(r: ElecReglagesLocal): Record<string, string> {
  const f: Record<string, string> = {};
  for (const { cle } of TOUS) {
    const v = r[cle];
    f[cle as string] = v == null ? '' : String(v);
  }
  return f;
}

export default function EauElecReglagesPage() {
  const { chargement, reglages, droits, relire } = useDonneesElec();
  const ecriture = droits.gestion;
  const [form, setForm] = useState<Record<string, string>>({});
  const [essai, setEssai] = useState(true);
  const [erreurs, setErreurs] = useState<ErreursReglages>({});
  const [busy, setBusy] = useState(false);

  // Le formulaire suit la base (lecture locale puis réponse du serveur) tant que la
  // personne n'a rien touché : une réponse tardive n'efface jamais une saisie en cours.
  const touche = useRef(false);
  useEffect(() => {
    if (touche.current) return;
    const r = reglages ?? REGLAGES_DEFAUT;
    setForm(versFormulaire(r));
    setEssai(r.mode_essai);
  }, [reglages]);

  const set = (k: string, v: string) => {
    touche.current = true;
    setForm((p) => ({ ...p, [k]: v }));
    if (erreurs[k]) setErreurs((e) => ({ ...e, [k]: '' }));
  };

  const mois = Number(cycleParDefaut().split('-')[1]);
  const annee = Number(form.numero_annee) || REGLAGES_DEFAUT.numero_annee;
  const prochain = Number(form.numero_prochain) || REGLAGES_DEFAUT.numero_prochain;
  const apercuNumero = numeroFacture(annee, mois, prochain);
  const prochainEssai = Number(form.numero_essai_prochain) || REGLAGES_DEFAUT.numero_essai_prochain || 50;
  const apercuEssai = numeroFacture(reglages?.numero_essai_annee ?? annee, mois, prochainEssai);

  const enregistrer = async () => {
    if (!ecriture || busy) return;
    const e = { ...controlerReglages(form), ...controlerCoursBcm(form.cours_bcm ?? '', form.date_cours_bcm ?? '', aujourdhuiMg()) };
    const bloquantes = Object.fromEntries(Object.entries(e).filter(([, v]) => v));
    setErreurs(bloquantes);
    if (Object.keys(bloquantes).length > 0) {
      toast.error('Corrigez les champs signalés');
      return;
    }
    const patch: Partial<ElecReglagesLocal> = { mode_essai: essai };
    for (const { cle } of TOUS) {
      const brut = (form[cle as string] ?? '').trim();
      if (NUMERIQUES.has(cle as string)) {
        (patch as any)[cle] = brut === '' ? null : Number(brut.replace(/\s+/g, '').replace(',', '.'));
      } else if (cle === 'iban') {
        patch.iban = brut === '' ? null : formaterIban(brut);
      } else if (cle === 'bic') {
        patch.bic = brut === '' ? null : brut.replace(/\s+/g, '').toUpperCase();
      } else {
        (patch as any)[cle] = brut === '' ? null : brut;
      }
    }
    if (!patch.devise) patch.devise = 'MGA';
    // Passage du mode essai au mode officiel : confirmation qui dit le prochain numéro officiel.
    if ((reglages?.mode_essai ?? true) && !essai) {
      const ok = await showConfirm(
        `Les prochaines factures émises seront OFFICIELLES. Prochain numéro officiel : ${apercuNumero}. Les numéros d’essai et officiels ne se mélangent jamais.`,
        'Passer en mode officiel',
        { confirmText: 'Passer en officiel', variant: 'warning' }
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      await saveReglages(patch);
      touche.current = false;
      await relire();
      toast.success('Réglages enregistrés');
    } finally {
      setBusy(false);
    }
  };

  const champs = (liste: Champ[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {liste.map(({ cle, libelle, aide, mode }) => {
        const k = cle as string;
        const err = erreurs[k];
        return (
          <label key={k} className="text-sm block">
            <span className="block text-gray-700 mb-1">{libelle}</span>
            <input
              type={mode === 'email' ? 'email' : mode === 'tel' ? 'tel' : 'text'}
              inputMode={mode === 'decimal' ? 'decimal' : mode === 'numeric' ? 'numeric' : mode === 'email' ? 'email' : mode === 'tel' ? 'tel' : undefined}
              value={form[k] ?? ''}
              onChange={(e) => set(k, e.target.value)}
              disabled={!ecriture}
              aria-invalid={!!err}
              data-reglage={k}
              className={`${champCls} ${err ? 'border-rose-400' : ''}`}
            />
            {err ? (
              <span className="block text-xs text-rose-700 mt-0.5" role="alert">{err}</span>
            ) : (
              aide && <span className="block text-xs text-gray-500 mt-0.5">{aide}</span>
            )}
          </label>
        );
      })}
    </div>
  );

  return (
    <EauPageShell
      title="Réglages RTB Énergie"
      subtitle="Identité, règlement et calcul des factures d’électricité"
      tone="elec"
      actions={!ecriture ? <LectureSeule /> : undefined}
      aide={{
        id: 'elec-reglages',
        quoi: (
          <>
            Ces réglages servent aux factures d’électricité : qui les émet (RTB Énergie), comment payer,
            le tarif au kWh, le forfait mensuel, la TVA et la numérotation officielle.
          </>
        ),
        comment: (
          <>
            Ouvrez une section, remplissez les champs puis touchez « Enregistrer ». Le NIF et le STAT ne
            contiennent que des chiffres ; l’IBAN commence par MG. Tant que le mode essai est actif, les
            factures préparées dans l’application ne s’envoient pas.
            {!ecriture && <> Vous consultez ces réglages sans pouvoir les modifier.</>}
          </>
        ),
      }}
    >
      {chargement ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : (
        <div className="space-y-3" data-elec-reglages>
          <Section icon={Euro} titre="Cours de référence BCM" ouvert>
            <CoursBcm
              cours={form.cours_bcm ?? ''}
              date={form.date_cours_bcm ?? ''}
              setCours={(v) => set('cours_bcm', v)}
              setDate={(v) => set('date_cours_bcm', v)}
              ecriture={ecriture}
              erreurs={erreurs}
              enregistre={reglages ?? null}
            />
          </Section>
          <Section icon={Building2} titre="Identité de RTB" ouvert>{champs(IDENTITE)}</Section>
          <Section icon={Landmark} titre="Règlement">{champs(REGLEMENT)}</Section>
          <Section icon={FileText} titre="Désignation sur la facture">{champs(DESIGNATION)}</Section>
          <Section icon={Calculator} titre="Calcul">{champs(CALCUL)}</Section>
          <Section icon={Hash} titre="Numérotation" ouvert>
            {champs(NUMEROTATION)}
            <div className="mt-3 rounded-xl bg-rtb-gold/10 border border-rtb-gold/40 px-3 py-3">
              <p className="text-xs text-gray-600">Prochain numéro de facture</p>
              <p className="text-xl font-bold tracking-wide text-rtb-green" data-elec-prochain-numero>
                {apercuNumero}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Le mois est celui de la consommation facturée.</p>
              <p className="text-xs text-gray-600 mt-2">Prochain numéro d’essai</p>
              <p className="text-base font-semibold tracking-wide text-rtb-green" data-elec-prochain-essai>{apercuEssai}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Deux compteurs séparés : les factures d’essai prennent leurs numéros dans le compteur d’essai et ne font
                jamais avancer le compteur officiel.
              </p>
            </div>
            <label className="mt-3 flex items-start gap-3 min-h-[44px] cursor-pointer">
              <input
                type="checkbox"
                role="switch"
                aria-checked={essai}
                checked={essai}
                onChange={(e) => {
                  touche.current = true;
                  setEssai(e.target.checked);
                }}
                disabled={!ecriture}
                data-elec-mode-essai
                className="mt-1 w-5 h-5 rounded border-gray-300 text-rtb-green focus:ring-rtb-gold"
              />
              <span className="text-sm">
                <span className="font-semibold text-rtb-green">Mode essai {essai ? 'actif' : 'arrêté'}</span>
                <span className="block text-gray-600">
                  En essai, les factures ne s’envoient pas et le compteur officiel n’avance pas.
                </span>
              </span>
            </label>
          </Section>
          {ecriture && (
            <ElecBouton icon={Save} onClick={enregistrer} disabled={busy} className="w-full py-3" data-elec-reglages-enregistrer>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </ElecBouton>
          )}
        </div>
      )}
    </EauPageShell>
  );
}

/** « Cours de référence BCM : 1 € = ... Ar, du JJ/MM/AAAA » (cahier 5.5). */
function CoursBcm({
  cours, date, setCours, setDate, ecriture, erreurs, enregistre,
}: {
  cours: string;
  date: string;
  setCours: (v: string) => void;
  setDate: (v: string) => void;
  ecriture: boolean;
  erreurs: ErreursReglages;
  enregistre: ElecReglagesLocal | null;
}) {
  const etat = etatCoursBcm(enregistre, aujourdhuiMg());
  return (
    <div className="space-y-2" data-elec-bcm>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
        <span className="text-gray-700 font-medium">Cours de référence BCM : 1 € =</span>
        <AideChamp id="bcm" libelle="cours de référence BCM">
          Sur le site de la Banque centrale de Madagascar (BCM), rubrique marché de change, recherche de taux de
          change : lisez la troisième colonne, « cours de référence », pour l’euro, et sa date. Le cours sert à écrire
          l’équivalent en euros, à titre indicatif, sur chaque facture émise ce jour-là.
        </AideChamp>
      </div>
      <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,12rem)_auto_auto_minmax(0,11rem)] items-center gap-2 text-sm">
        <input
          type="text"
          inputMode="decimal"
          value={cours}
          onChange={(e) => setCours(e.target.value)}
          disabled={!ecriture}
          placeholder="5 000,00"
          aria-label="Cours de référence BCM, Ariary pour 1 euro"
          aria-invalid={!!erreurs.cours_bcm}
          data-reglage="cours_bcm"
          className={`${champCls} ${erreurs.cours_bcm ? 'border-rose-400' : ''}`}
        />
        <span className="text-gray-700">Ar, du</span>
        <input
          type="date"
          value={date}
          max={aujourdhuiMg()}
          onChange={(e) => setDate(e.target.value)}
          disabled={!ecriture}
          aria-label="Date du cours de référence BCM"
          aria-invalid={!!erreurs.date_cours_bcm}
          data-reglage="date_cours_bcm"
          className={`${champCls} col-span-2 sm:col-span-1 ${erreurs.date_cours_bcm ? 'border-rose-400' : ''}`}
        />
      </div>
      {(erreurs.cours_bcm || erreurs.date_cours_bcm) && (
        <p className="text-xs text-rose-700" role="alert">{erreurs.cours_bcm || erreurs.date_cours_bcm}</p>
      )}
      <p className={`text-xs ${etat.manquant ? 'text-rose-700' : etat.ancien ? 'text-amber-800' : 'text-gray-500'}`} data-elec-bcm-etat>
        {etat.manquant
          ? 'Aucun cours enregistré : l’émission des factures est refusée tant qu’il manque.'
          : etat.ancien
          ? `Cours enregistré il y a ${etat.age} jours : une confirmation sera demandée à l’émission.`
          : `Cours enregistré il y a ${etat.age} jour${(etat.age ?? 0) > 1 ? 's' : ''}.`}
      </p>
    </div>
  );
}

function Section({
  icon: Icon,
  titre,
  ouvert = false,
  children,
}: {
  icon: typeof Building2;
  titre: string;
  ouvert?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={ouvert} className="group rounded-2xl border border-rtb-gold/40 bg-white shadow-soft">
      <summary className="flex items-center gap-2 px-4 min-h-[48px] cursor-pointer list-none select-none">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-rtb-green text-rtb-gold flex-shrink-0">
          <Icon className="w-4 h-4" aria-hidden="true" />
        </span>
        <span className="flex-1 font-semibold text-rtb-green">{titre}</span>
        <ChevronDown className="w-4 h-4 text-rtb-green transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="px-4 pb-4 pt-1">{children}</div>
    </details>
  );
}
