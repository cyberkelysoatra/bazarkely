/**
 * Réglages RTB Énergie /gestion-eau/elec/reglages (ELEC-CC-02), sur le modèle de
 * EauConfigPage : identité, règlement, désignation, calcul, numérotation. Écriture :
 * admin et gestion électricité ; lecture seule réelle pour promoteur et lecture.
 * Aucune valeur d'identité ni bancaire n'est connue du code (saisie par RTB).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Building2, Landmark, FileText, Calculator, Hash, Save, ChevronDown } from 'lucide-react';
import EauPageShell from '../EauPageShell';
import { ElecBouton, LectureSeule, champCls, useDonneesElec } from './ElecUi';
import { saveReglages, REGLAGES_DEFAUT } from '../../services/eauElecService';
import { controlerReglages, formaterIban, numeroFacture, type ErreursReglages } from '../../utils/elecReglages';
import { cycleParDefaut } from '../../utils/elecReleves';
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
  { cle: 'numero_prochain', libelle: 'Prochain numéro', mode: 'numeric' },
];
const TOUS = [...IDENTITE, ...REGLEMENT, ...DESIGNATION, ...CALCUL, ...NUMEROTATION];
const NUMERIQUES = new Set<string>(['puissance_kwc', 'tarif_kwh', 'forfait_ht', 'tva_pct', 'echeance_jours', 'numero_annee', 'numero_prochain']);

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

  const enregistrer = async () => {
    if (!ecriture || busy) return;
    const e = controlerReglages(form);
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
        (patch as any)[cle] = brut === '' ? null : Number(brut.replace(',', '.'));
      } else if (cle === 'iban') {
        patch.iban = brut === '' ? null : formaterIban(brut);
      } else if (cle === 'bic') {
        patch.bic = brut === '' ? null : brut.replace(/\s+/g, '').toUpperCase();
      } else {
        (patch as any)[cle] = brut === '' ? null : brut;
      }
    }
    if (!patch.devise) patch.devise = 'MGA';
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
