// Module 1 "Structurer le projet" (workbook pages 4 and 5): 1a problem tree, 1b target client,
// 1c value proposition with its live sentence, 1d why me.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { AtelierProps, Plan } from '../../types';
import { ChampTexte } from '../../composants/Champs';
import { Carte } from '../../composants/Carte';
import { Aide } from '../../composants/Aide';
import { phraseValeur } from './phrase';

type Client = Plan['m1']['client'];

const CLIENT: { cle: keyof Client; label: string }[] = [
  { cle: 'qui', label: 'Qui est-il ? (particulier, hôtel, commerce, administration, touriste...)' },
  { cle: 'ou', label: 'Où se trouve-t-il ?' },
  { cle: 'combien', label: 'Combien sont-ils ? (estimation)' },
  { cle: 'aujourdhui', label: "Que fait-il ou qu'achète-t-il aujourd'hui pour régler ce problème ?" },
  { cle: 'prixAujourdhui', label: "Combien paie-t-il aujourd'hui ?" },
  { cle: 'decideur', label: "Qui décide de l'achat ? Qui paie ?" }
];

/** Trunk drawn between two cards: branches spread up (top) or roots spread down (bottom). */
function Tronc({ sens }: { sens: 'branches' | 'racines' }) {
  const haut = sens === 'branches';
  return (
    <svg viewBox="0 0 120 40" className="block mx-auto w-28 h-10 text-violet" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round">
      {haut ? (
        <>
          <path d="M60 40V14" />
          <path d="M60 22C52 14 40 8 26 4" strokeWidth="4" />
          <path d="M60 22C68 14 80 8 94 4" strokeWidth="4" />
          <path d="M60 14V3" strokeWidth="4" />
        </>
      ) : (
        <>
          <path d="M60 0v24" />
          <path d="M60 18C52 26 40 32 26 37" strokeWidth="4" />
          <path d="M60 18C68 26 80 32 94 37" strokeWidth="4" />
          <path d="M60 24v13" strokeWidth="4" />
        </>
      )}
    </svg>
  );
}

function Etage({ etiquette, ton, children }: { etiquette: string; ton: 'blanc' | 'violet'; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border-2 px-3.5 pt-3 pb-0.5 ${ton === 'violet' ? 'bg-violetClair border-violet' : 'bg-white border-filet'}`}>
      <p className="text-[13px] font-bold tracking-wide text-violet mb-1.5">{etiquette}</p>
      {children}
    </div>
  );
}

export default function Page({ plan, modifier, lectureSeule: ls }: AtelierProps) {
  const m1 = plan.m1;
  const set = (recette: (m: Plan['m1']) => void) => modifier((p) => recette(p.m1));
  const nomProjet = plan.identite.nomProjet.trim();
  const phrase = phraseValeur(plan);

  return (
    <>
      <Carte ton="violet" titre="Structurer le projet">
        <p className="text-[16px] leading-relaxed text-encre">
          Un projet solide répond clairement à quatre questions, dans cet ordre : quel problème ? pour qui ? quelle solution ? pourquoi moi ?
        </p>
      </Carte>

      <Aide titre="À retenir">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Commencez par le problème, jamais par la solution.</li>
          <li>Allez parler à 5 clients avant de dépenser 1 ariary : leurs réponses valent plus que vos suppositions.</li>
          <li>« Pourquoi moi ? » : votre expérience, votre réseau, votre emplacement, votre savoir-faire. C'est ce que le jury regarde en premier.</li>
        </ul>
      </Aide>

      <Carte titre="1a. Mon arbre à problèmes" sousTitre="Les branches en haut, le tronc au milieu, les racines en bas." className="bp-m1a">
        <Aide titre="Exemple JUS'NOSY">
          <p>
            <span className="font-bold">Conséquences :</span> argent qui sort de l'île, producteurs mal payés, déchets plastique.
          </p>
          <p className="mt-1.5">
            <span className="font-bold">Problème central :</span> les hôtels de Nosy Be servent surtout des jus importés ou industriels.
          </p>
          <p className="mt-1.5">
            <span className="font-bold">Causes :</span> peu d'offre locale régulière, fruits perdus faute de transformation.
          </p>
        </Aide>
        <Etage etiquette="CONSÉQUENCES" ton="blanc">
          <ChampTexte label="Que se passe-t-il si personne ne règle ce problème ?" valeur={m1.consequences} onChange={(v) => set((m) => void (m.consequences = v))} lectureSeule={ls} />
        </Etage>
        <Tronc sens="branches" />
        <Etage etiquette="PROBLÈME CENTRAL" ton="violet">
          <ChampTexte label="En une phrase, le problème que mon projet règle :" valeur={m1.probleme} onChange={(v) => set((m) => void (m.probleme = v))} lectureSeule={ls} />
        </Etage>
        <Tronc sens="racines" />
        <Etage etiquette="CAUSES" ton="blanc">
          <ChampTexte
            label="Pourquoi ce problème existe-t-il ? Notez la ou les causes sur lesquelles votre projet agit."
            valeur={m1.causes}
            onChange={(v) => set((m) => void (m.causes = v))}
            lectureSeule={ls}
          />
        </Etage>
      </Carte>

      <Carte titre="1b. Mon client cible" sousTitre="« Tout le monde » n'est pas un client." className="bp-m1b">
        {CLIENT.map((q) => (
          <ChampTexte key={q.cle} label={q.label} valeur={m1.client[q.cle]} onChange={(v) => set((m) => void (m.client[q.cle] = v))} lectureSeule={ls} />
        ))}
      </Carte>

      <Carte titre="1c. Ma proposition de valeur" sousTitre="Complétez la phrase, morceau par morceau." className="bp-m1c">
        <p className="text-[15px] text-doux leading-snug mb-3">
          Pour [client] qui [problème ou besoin], [nom du projet] propose [solution] qui [bénéfice principal], contrairement à [ce qu'il utilise aujourd'hui].
        </p>
        <ChampTexte label="Pour (le client)" valeur={m1.pv.pour} onChange={(v) => set((m) => void (m.pv.pour = v))} lectureSeule={ls} placeholder="les hôtels de Nosy Be" />
        <ChampTexte label="qui (le problème ou le besoin)" valeur={m1.pv.qui} onChange={(v) => set((m) => void (m.pv.qui = v))} lectureSeule={ls} />
        <div className="mb-4">
          <p className="text-[15px] font-bold text-encre leading-snug">Nom du projet</p>
          {nomProjet ? (
            <p className="mt-1 text-base text-encre">{nomProjet}</p>
          ) : (
            <p className="mt-1 text-[15px] text-doux leading-snug">
              Pas encore de nom.{' '}
              {ls ? null : (
                <Link to={`/p/${plan.id}/identite`} className="font-bold text-violet underline underline-offset-2">
                  Le noter dans la fiche d'identité
                </Link>
              )}
            </p>
          )}
        </div>
        <ChampTexte label="propose (la solution)" valeur={m1.pv.propose} onChange={(v) => set((m) => void (m.pv.propose = v))} lectureSeule={ls} />
        <ChampTexte label="qui (le bénéfice principal)" valeur={m1.pv.quiBenefice} onChange={(v) => set((m) => void (m.pv.quiBenefice = v))} lectureSeule={ls} />
        <ChampTexte
          label="contrairement à (ce qu'il utilise aujourd'hui)"
          valeur={m1.pv.contrairement}
          onChange={(v) => set((m) => void (m.pv.contrairement = v))}
          lectureSeule={ls}
        />
        <div className="rounded-xl bg-turquoiseClair px-3.5 py-3">
          <p className="text-[13px] font-bold tracking-wide text-turquoiseTexte mb-1">MA PHRASE</p>
          <p className="bp-pv-phrase text-[17px] leading-relaxed text-encre break-words" aria-live="polite">
            {phrase.map((m, i) => (
              <span key={i} className={m.sorte === 'vide' ? 'text-doux italic' : m.sorte === 'saisi' ? 'font-bold' : undefined}>
                {m.texte}
              </span>
            ))}
          </p>
        </div>
      </Carte>

      <Carte titre="1d. Pourquoi moi ?" className="bp-m1d">
        <ChampTexte
          label="Mes atouts pour réussir ce projet (expérience, savoir-faire, réseau, terrain, matériel) :"
          valeur={m1.pourquoiMoi}
          onChange={(v) => set((m) => void (m.pourquoiMoi = v))}
          lectureSeule={ls}
        />
      </Carte>
    </>
  );
}
