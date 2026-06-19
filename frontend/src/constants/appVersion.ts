export const APP_VERSION = '3.66.4';
export const APP_VERSION_NAME = 'Page RelevÃƒÂ©s (module Eau) : en faisant dÃƒÂ©filer la page, les onglets Compteurs / Source restent dÃƒÂ©sormais collÃƒÂ©s juste sous l\'en-tÃƒÂªte (le reste de la page glisse dessous). La saisie d\'un relevÃƒÂ© de compteur accepte une date et heure facultative Ã¢â‚¬â€ laissÃƒÂ©e vide, le relevÃƒÂ© est horodatÃƒÂ© maintenant ; renseignÃƒÂ©e, on peut saisir un relevÃƒÂ© passÃƒÂ© (une date future est refusÃƒÂ©e) Ã¢â‚¬â€ avec l\'index et la date affichÃƒÂ©s sur une mÃƒÂªme ligne. En mode ÃƒÂ©dition (admin), la date et l\'index d\'un relevÃƒÂ© passent aussi cÃƒÂ´te ÃƒÂ  cÃƒÂ´te. Les deux raccourcis du bas reprennent les icÃƒÂ´nes des cartes de saisie de la source (verre d\'eau pour Ã‚Â« Saisir bassin Ã‚Â», flÃƒÂ¨che d\'entrÃƒÂ©e pour Ã‚Â« Ajouter apport Ã‚Â»). (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.62.0 : Module Eau : corrections et fiabilitÃƒÂ© (sans changement d\'usage). Le graphique Tendances affiche dÃƒÂ©sormais les deux courbes de consommation (mesurÃƒÂ©e et estimÃƒÂ©e) alignÃƒÂ©es sur le mÃƒÂªme jour, mÃƒÂªme tÃƒÂ´t le matin (fuseau de Madagascar) ; les alertes ne se dÃƒÂ©doublent plus autour de minuit ; les ÃƒÂ©crans ne restent plus bloquÃƒÂ©s sur un rond qui tourne en cas de coupure rÃƒÂ©seau ; aprÃƒÂ¨s import de contacts, supprimer une ligne au milieu de la liste ne dÃƒÂ©cale plus les autres champs. Suppressions plus sÃƒÂ»res hors connexion : un relevÃƒÂ© ou un compteur supprimÃƒÂ© sans rÃƒÂ©seau est bien conservÃƒÂ© puis appliquÃƒÂ© au serveur au retour en ligne (la ligne ne rÃƒÂ©apparaÃƒÂ®t plus), et le recalcul des bilans ne crÃƒÂ©e plus de doublons. Les factures PDF passent au vert AHUVI (fini le bleu). Nettoyage interne sans effet visible. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.60.2 : Correctif de mise en ligne : des fonctions utilisÃƒÂ©es par le tableau de bord eau (affichage des dÃƒÂ©bits en mÃ‚Â³/h, de la puissance en kW, et la consommation ÃƒÂ©lectrique rÃƒÂ©cente) avaient ÃƒÂ©tÃƒÂ© ÃƒÂ©crites mais jamais publiÃƒÂ©es, ce qui empÃƒÂªchait la fabrication de la version en ligne (le site restait bloquÃƒÂ© sur une version antÃƒÂ©rieure). Ces fonctions sont maintenant publiÃƒÂ©es : toutes les ÃƒÂ©volutions rÃƒÂ©centes du module Eau deviennent visibles en ligne. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.60.1 : Gestion Eau (sur tÃƒÂ©lÃƒÂ©phone) : la bande systÃƒÂ¨me tout en haut de l\'ÃƒÂ©cran (heure, rÃƒÂ©seau, batterie) n\'est plus violette dans le module Eau Ã¢â‚¬â€ elle prend la couleur verte du bandeau AHUVI. Le violet reste utilisÃƒÂ© dans BazarKELY et Construction. Ãƒâ‚¬ noter : la barre d\'ÃƒÂ©tat du systÃƒÂ¨me ne peut afficher qu\'une couleur unie (l\'effet translucide/flou du bandeau ne peut pas y ÃƒÂªtre reproduit) Ã¢â‚¬â€ on y met donc le vert dominant du bandeau. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.60.0 : le sÃƒÂ©lecteur de pÃƒÂ©riode en haut ÃƒÂ  droite devient un vrai menu dÃƒÂ©roulant soignÃƒÂ©. Au lieu du menu gris du navigateur, il ouvre dÃƒÂ©sormais un petit panneau aux couleurs de l\'app (coins arrondis, ombre douce, option active surlignÃƒÂ©e avec une coche), avec une animation d\'ouverture fluide faÃƒÂ§on iOS (apparition vive puis arrivÃƒÂ©e en douceur, sans rebond). Il se ferme en touchant ailleurs ou avec la touche Ãƒâ€°chap, et respecte le rÃƒÂ©glage Ã‚Â« animations rÃƒÂ©duites Ã‚Â» du tÃƒÂ©lÃƒÂ©phone. Le choix et son effet sur les chiffres ne changent pas. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.59.9 : l\'icÃƒÂ´ne de la carte Ã‚Â« Stock actuel Ã‚Â» passe de la goutte ÃƒÂ  un verre/contenant avec niveau d\'eau (plus parlant pour le Ã‚Â« remplissage Ã‚Â» du bassin et pour ÃƒÂ©viter d\'avoir deux gouttes identiques). Ã‚Â« Conso au compteur Ã‚Â» garde la goutte. PrÃƒÂ©sentation uniquement. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.59.8 : l\'icÃƒÂ´ne de la carte Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â» change Ã¢â‚¬â€ l\'ancien symbole pourcentage (hÃƒÂ©ritÃƒÂ© du Ã‚Â« NRW Ã‚Â») est remplacÃƒÂ© par une loupe barrÃƒÂ©e (eau qui ÃƒÂ©chappe au comptage), plus parlant et qui ne fait plus doublon avec les gouttes des autres cartes. PrÃƒÂ©sentation uniquement. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.59.7 : la carte Ã‚Â« Conso au compteur Ã‚Â» affiche dÃƒÂ©sormais, ÃƒÂ  droite de sa valeur, sa part de la Ã‚Â« Conso du rÃƒÂ©seau Ã‚Â» (en gris) Ã¢â‚¬â€ comme la carte Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â». Les deux pourcentages se complÃƒÂ¨tent (Ã¢â€°Ë† 100 %). PrÃƒÂ©sentation uniquement. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.59.6 : la carte Ã‚Â« Autonomie estimÃƒÂ©e Ã‚Â» affiche dÃƒÂ©sormais, ÃƒÂ  droite de la consommation moyenne par jour (mÃ‚Â³/j), son ÃƒÂ©quivalent par heure (mÃ‚Â³/h) en gris. PrÃƒÂ©sentation uniquement. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.59.5 : la carte Ã‚Â« Conso au compteur Ã‚Â» n\'affiche plus qu\'une seule ligne sous sa valeur (le volume Ã‚Â« X mÃ‚Â³ sur la pÃƒÂ©riode Ã‚Â») Ã¢â‚¬â€ la petite mention d\'origine du chiffre (Ã‚Â« estimÃƒÂ©e Ã¢â‚¬Â¦ Ã‚Â»/Ã‚Â« mesurÃƒÂ©e Ã¢â‚¬Â¦ Ã‚Â») est retirÃƒÂ©e. PrÃƒÂ©sentation uniquement. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.59.4 : le pourcentage d\'eau non comptÃƒÂ©e s\'affiche dÃƒÂ©sormais en gris ÃƒÂ  droite de la valeur de la carte Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â» elle-mÃƒÂªme (et non plus sur la carte Ã‚Â« Conso au compteur Ã‚Â»). PrÃƒÂ©sentation uniquement. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.59.3 : le pourcentage d\'eau non comptÃƒÂ©e (part de la Ã‚Â« Conso du rÃƒÂ©seau Ã‚Â») est dÃƒÂ©placÃƒÂ© Ã¢â‚¬â€ il s\'affiche dÃƒÂ©sormais en gris ÃƒÂ  droite de la valeur de la carte Ã‚Â« Conso au compteur Ã‚Â», et la ligne grise sous la carte Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â» est retirÃƒÂ©e (cette carte ne montre plus que son dÃƒÂ©bit et son volume Ã‚Â« hors compteur Ã‚Â»). PrÃƒÂ©sentation uniquement. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.59.2 : Gestion Eau, tableau de bord : la carte Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â» s\'affiche dÃƒÂ©sormais comme les autres indicateurs Ã¢â‚¬â€ en dÃƒÂ©bit (mÃ‚Â³/h) au lieu d\'un pourcentage. Le grand chiffre est le dÃƒÂ©bit d\'eau non comptÃƒÂ©e, le sous-texte indique le volume Ã‚Â« X mÃ‚Â³ hors compteur Ã‚Â», et une ligne grise prÃƒÂ©cise le pourcentage que cela reprÃƒÂ©sente par rapport ÃƒÂ  la Ã‚Â« Conso du rÃƒÂ©seau Ã‚Â». Comme les cartes voisines, elle suit la pÃƒÂ©riode choisie en haut ÃƒÂ  droite. PrÃƒÂ©sentation uniquement. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.59.1 : Gestion Eau, tableau de bord : la carte Ã‚Â« NRW (pÃƒÂ©riode) Ã‚Â» est renommÃƒÂ©e Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â». Le chiffre (en %) et le volume affichÃƒÂ© sont les mÃƒÂªmes qu\'avant, mais le libellÃƒÂ© dit dÃƒÂ©sormais la vÃƒÂ©ritÃƒÂ© : c\'est l\'eau sortie du bassin mais pas (encore) comptÃƒÂ©e Ã¢â‚¬â€ villas sans compteur, parties communes, arrosage du golf Ã¢â‚¬â€ plus les vraies pertes ; ce n\'est un Ã‚Â« taux de pertes Ã‚Â» que lorsque tous les usages seront comptÃƒÂ©s. La carte passe au jaune (Ã‚Â« ÃƒÂ  surveiller Ã‚Â») au lieu du rouge (Ã‚Â« perte Ã‚Â»), et le sous-texte indique Ã‚Â« X mÃ‚Â³ non comptÃƒÂ©s sur la pÃƒÂ©riode Ã‚Â». Garde-fous : si le dÃƒÂ©bit des pompes n\'est pas connu (aucun test de dÃƒÂ©bit), la carte affiche Ã‚Â« Ã¢â‚¬â€ Ã‚Â» avec Ã‚Â« DÃƒÂ©bit des pompes requis Ã‚Â» ; et un ÃƒÂ©cart nÃƒÂ©gatif aberrant (compteurs au-dessus de la sortie estimÃƒÂ©e) n\'affiche plus de pourcentage absurde. PrÃƒÂ©sentation uniquement : les calculs (Phase prÃƒÂ©cÃƒÂ©dente) ne changent pas. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.59.0 : Gestion Eau, tableau de bord : la Ã‚Â« Conso du rÃƒÂ©seau Ã‚Â» (eau sortie du bassin) est dÃƒÂ©sormais calculÃƒÂ©e ÃƒÂ  partir du DÃƒâ€°BIT des pompes Ãƒâ€” leur TEMPS DE MARCHE rÃƒÂ©el (temps ÃƒÂ©coulÃƒÂ© moins les arrÃƒÂªts de pompe que vous saisissez), au lieu d\'un calcul qui se plafonnait au niveau du flotteur et rendait le chiffre incohÃƒÂ©rent (la conso rÃƒÂ©seau pouvait tomber sous la conso comptÃƒÂ©e, d\'oÃƒÂ¹ un Ã‚Â« NRW Ã‚Â» nÃƒÂ©gatif aberrant). ConsÃƒÂ©quences : Ã‚Â« Conso du rÃƒÂ©seau Ã‚Â» reflÃƒÂ¨te maintenant l\'eau rÃƒÂ©ellement dÃƒÂ©livrÃƒÂ©e, et l\'ÃƒÂ©cart avec la Ã‚Â« Conso au compteur Ã‚Â» (affichÃƒÂ© pour l\'instant dans la carte NRW) redevient positif et cohÃƒÂ©rent Ã¢â‚¬â€ c\'est en rÃƒÂ©alitÃƒÂ© de l\'EAU NON COMPTÃƒâ€°E (villas sans compteur, parties communes, arrosage du golf) plus les vraies pertes ; le renommage de cette carte en Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â» viendra ÃƒÂ  l\'ÃƒÂ©tape suivante. Cette eau non comptÃƒÂ©e n\'est PLUS traitÃƒÂ©e comme une anomalie (elle est normale tant que tout n\'est pas comptÃƒÂ©). Le calcul du stock attendu, des ÃƒÂ©carts de niveau et la facturation (basÃƒÂ©e sur les compteurs) ne changent pas. IMPORTANT : pour appliquer ces nouveaux chiffres aux relevÃƒÂ©s DÃƒâ€°JÃƒâ‚¬ enregistrÃƒÂ©s, l\'administrateur lance une fois Ã‚Â« Recalculer tous les bilans Ã‚Â» (onglet Source Ã¢â€ â€™ Ã‚Â« RelevÃƒÂ©s rÃƒÂ©cents Ã‚Â»). (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.58.0 : Gestion Eau, page Ã‚Â« RelevÃƒÂ©s Ã‚Â», onglet Ã‚Â« Source Ã‚Â» : nouvelle section dÃƒÂ©pliable Ã‚Â« ArrÃƒÂªts de pompe Ã‚Â». On peut dÃƒÂ©sormais noter les pÃƒÂ©riodes pendant lesquelles les pompes ÃƒÂ©taient ÃƒÂ  l\'arrÃƒÂªt, au choix de deux faÃƒÂ§ons : soit en indiquant l\'heure de dÃƒÂ©but ET de fin, soit en indiquant l\'heure de dÃƒÂ©but ET une durÃƒÂ©e (en minutes). Chaque arrÃƒÂªt enregistrÃƒÂ© apparaÃƒÂ®t dans une liste (avec sa durÃƒÂ©e) et peut ÃƒÂªtre supprimÃƒÂ©. Ces donnÃƒÂ©es serviront prochainement ÃƒÂ  estimer plus justement l\'eau rÃƒÂ©ellement apportÃƒÂ©e par les pompes (leur Ã‚Â« temps de marche Ã‚Â» = temps ÃƒÂ©coulÃƒÂ© moins les arrÃƒÂªts) ; pour l\'instant, cette saisie n\'a AUCUN effet sur les chiffres du tableau de bord. Tout est enregistrÃƒÂ© et synchronisÃƒÂ© comme les autres relevÃƒÂ©s et fonctionne hors connexion. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.57.7 : Tableau de bord Gestion Eau : sous la carte Ã‚Â« Pompes en marche Ã‚Â», le texte Ã‚Â« Apport des pompes Ã‚Â» devient Ã‚Â« DÃƒÂ©bit entrant Ã‚Â». PrÃƒÂ©sentationnel uniquement. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.57.6 : la carte Ã‚Â« DÃƒÂ©bit source Ã‚Â» est renommÃƒÂ©e Ã‚Â« Pompes en marche Ã‚Â» (titre raccourci). (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.57.5 : la carte Ã‚Â« DÃƒÂ©bit source Ã‚Â» est renommÃƒÂ©e Ã‚Â« DÃƒÂ©bit pompes en marche Ã‚Â» (le dÃƒÂ©bit instantanÃƒÂ© des pompes quand elles tournent). Renommage d\'affichage uniquement. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.57.4 : Tableau de bord Gestion Eau : deux cartes d\'indicateurs sont renommÃƒÂ©es pour lever l\'ambiguÃƒÂ¯tÃƒÂ© entre l\'eau facturable et l\'eau sortie du bassin. Ã‚Â« Conso (pÃƒÂ©riode) Ã‚Â» devient Ã‚Â« Conso au compteur Ã‚Â» (l\'eau rÃƒÂ©ellement comptÃƒÂ©e aux compteurs des villas, c\'est-ÃƒÂ -dire la consommation facturable) et Ã‚Â« Conso rÃƒÂ©seau (pÃƒÂ©riode) Ã‚Â» devient Ã‚Â« Conso du rÃƒÂ©seau Ã‚Â» (toute l\'eau sortie du bassin vers les canalisations = consommation + pertes). La carte Ã‚Â« NRW Ã‚Â» affiche, elle, la diffÃƒÂ©rence (les pertes). La pÃƒÂ©riode reste indiquÃƒÂ©e sous chaque valeur. Renommage d\'affichage uniquement : aucun calcul ni donnÃƒÂ©e modifiÃƒÂ©. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.57.3 : Tableau de bord Gestion Eau : le sous-titre cliquable de l\'en-tÃƒÂªte est raccourci en Ã‚Â« Tableau de bord Ã‚Â» (au lieu de Ã‚Â« Tableau de bord du bassin et des compteurs Ã‚Â») pour ÃƒÂ©viter qu\'il passe sur deux lignes. PrÃƒÂ©sentation uniquement. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.57.2 : Tableau de bord Gestion Eau : petite retouche du sÃƒÂ©lecteur de pÃƒÂ©riode en haut ÃƒÂ  droite Ã¢â‚¬â€ la bordure propre du menu dÃƒÂ©roulant est supprimÃƒÂ©e et la petite flÃƒÂ¨che Ã‚Â« V Ã‚Â» ÃƒÂ  droite du texte est retirÃƒÂ©e. PrÃƒÂ©sentation uniquement, rien d\'autre ne change. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.57.1 : Tableau de bord Gestion Eau : finitions de prÃƒÂ©sentation. Le sÃƒÂ©lecteur de pÃƒÂ©riode en haut ÃƒÂ  droite (Ã‚Â« Depuis minuit / Sur 24 h / Sur la pÃƒÂ©riode Ã‚Â») adopte pleinement la charte AHUVI (icÃƒÂ´ne calendrier verte, petite flÃƒÂ¨che vers le bas, fond blanc, plus aucune teinte bleue). Dans les indicateurs, deux cartes changent d\'ordre : ÃƒÂ  gauche, Ã‚Â« DÃƒÂ©bit source Ã‚Â» passe au-dessus de Ã‚Â« EntrÃƒÂ©es Ã‚Â» (Stock actuel Ã‚Â· DÃƒÂ©bit source Ã‚Â· EntrÃƒÂ©es) ; ÃƒÂ  droite, Ã‚Â« Conso rÃƒÂ©seau Ã‚Â» passe tout en haut (Conso rÃƒÂ©seau Ã‚Â· Conso Ã‚Â· NRW Ã‚Â· Autonomie estimÃƒÂ©e). RÃƒÂ©organisation et habillage uniquement : aucun chiffre, calcul ni fonctionnement (y compris hors connexion) n\'est modifiÃƒÂ©. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.57.0 : Module Gestion Eau, page Ã‚Â« RelevÃƒÂ©s Ã‚Â», onglet Ã‚Â« Source Ã‚Â» : les deux cartes du haut qui parlaient toutes deux du bassin sont fusionnÃƒÂ©es en une seule. La carte Ã‚Â« Bassin Ã‚Â» disparaÃƒÂ®t : son dernier relevÃƒÂ© (hauteur, volume, date) et ses boutons sont dÃƒÂ©sormais intÃƒÂ©grÃƒÂ©s dans la carte Ã‚Â« Stock d\'eau du bassin Ã‚Â». Sous les chiffres Attendu/Ãƒâ€°cart figure maintenant une rangÃƒÂ©e avec, ÃƒÂ  gauche, le dernier relevÃƒÂ© (toucher Ã¢â€ â€™ l\'historique des niveaux) et, ÃƒÂ  droite, le petit crayon (toucher Ã¢â€ â€™ la saisie d\'une hauteur). Toucher le reste de la carte ouvre toujours l\'explication Ã‚Â« Comprendre cette situation Ã‚Â». Ãƒâ‚¬ l\'ouverture de la saisie ou de l\'historique, la carte glisse pour se placer juste sous l\'en-tÃƒÂªte, comme avant. Changement de prÃƒÂ©sentation uniquement : les calculs, la saisie, les raccourcis et le fonctionnement hors connexion sont inchangÃƒÂ©s. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.56.1 : Dans la barre du bas, Ã‚Â« Compteurs Ã‚Â» passe avant Ã‚Â« Suivi Ã‚Â». (2) Sur la page Ã‚Â« RelevÃƒÂ©s Ã‚Â» (onglet Compteurs), un nouveau bouton (ÃƒÂ  droite de Ã‚Â« Scan Ã‚Â») ouvre directement la crÃƒÂ©ation d\'un compteur. (3) La page Ã‚Â« Compteurs Ã‚Â» peut dÃƒÂ©sormais s\'ouvrir avec le formulaire de crÃƒÂ©ation dÃƒÂ©jÃƒÂ  dÃƒÂ©pliÃƒÂ©. (4) Ãƒâ‚¬ l\'ouverture du formulaire de crÃƒÂ©ation, la page glisse pour le placer juste sous l\'en-tÃƒÂªte. (5) Le bouton Ã‚Â« Modifier Ã‚Â» d\'un compteur ouvre maintenant un tiroir d\'ÃƒÂ©dition directement SOUS la carte concernÃƒÂ©e (au lieu du haut de la liste), et la carte glisse sous l\'en-tÃƒÂªte ; un seul tiroir d\'ÃƒÂ©dition ÃƒÂ  la fois. (6) Les boutons d\'action des cartes compteur (QR, Modifier, Supprimer) n\'affichent plus que leur icÃƒÂ´ne (une bulle d\'aide apparaÃƒÂ®t au survol). Changements de navigation et d\'affichage uniquement : aucun calcul, libellÃƒÂ© mÃƒÂ©tier ni donnÃƒÂ©e n\'est modifiÃƒÂ©, et l\'application reste utilisable hors connexion. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.54.0 : RafraÃƒÂ®chissement visuel du module Gestion Eau (ÃƒÂ©tape 2, prÃƒÂ©sentation uniquement) : les ÃƒÂ©crans secondaires (Tendances, Centre d\'alertes, Rapport mensuel, Annonces, Journal d\'audit, Configuration, CoÃƒÂ»ts ÃƒÂ©lectricitÃƒÂ©, Utilisateurs, Invitations & demandes, et l\'espace Ã‚Â« Le bassin Ã‚Â» du propriÃƒÂ©taire) adoptent ÃƒÂ  leur tour la charte AHUVI. Les cadres et bordures gris gÃƒÂ©nÃƒÂ©riques des cartes et des listes passent au vert clair de la charte ; les graphiques (courbes, barres, aires) puisent tous dans la mÃƒÂªme palette de couleurs cohÃƒÂ©rente ; et les chiffres affichÃƒÂ©s en or sont assombris pour ÃƒÂªtre nettement plus lisibles. CÃƒÂ´tÃƒÂ© finitions : les listes et sections apparaissent dÃƒÂ©sormais en douceur, et plusieurs boutons d\'action (modifier, supprimer, marquer comme lu/traitÃƒÂ©, fermer) sont agrandis pour ÃƒÂªtre plus faciles ÃƒÂ  toucher du doigt. Aucun calcul, libellÃƒÂ©, donnÃƒÂ©e ni le fonctionnement hors connexion n\'est modifiÃƒÂ©. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.53.0 : RafraÃƒÂ®chissement visuel du module Gestion Eau (ÃƒÂ©tape 1, prÃƒÂ©sentation uniquement) : les couleurs sont harmonisÃƒÂ©es ÃƒÂ  la charte AHUVI (vert et or pour l\'identitÃƒÂ©, bleu canard pour tout ce qui parle d\'eau). Les boutons Ã‚Â« Modifier Ã‚Â» qui ÃƒÂ©taient en bleu passent au style vert AHUVI ; les cadres et bordures gris gÃƒÂ©nÃƒÂ©riques des cartes et des listes adoptent le vert clair de la charte ; et les graphiques (courbes, barres) puisent dÃƒÂ©sormais dans une seule palette de couleurs cohÃƒÂ©rente. La prÃƒÂ©sentation gagne aussi en finition (titres et espacements plus rÃƒÂ©guliers). Aucun calcul, libellÃƒÂ©, donnÃƒÂ©e ni le fonctionnement hors connexion n\'est modifiÃƒÂ©. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.52.1 : Page Ã‚Â« RelevÃƒÂ©s Ã‚Â» (Gestion Eau), onglet Ã‚Â« Source Ã‚Â» : la carte Ã‚Â« Bassin Ã‚Â» adopte la mÃƒÂªme prÃƒÂ©sentation que les cartes de l\'onglet Ã‚Â« Compteurs Ã‚Â». Le bouton Ã‚Â« Historique Ã‚Â» disparaÃƒÂ®t Ã¢â‚¬â€ il suffit dÃƒÂ©sormais de toucher la carte pour ouvrir l\'historique des niveaux ; et le bouton Ã‚Â« Saisir hauteur Ã‚Â» pleine largeur est remplacÃƒÂ© par un petit bouton crayon, ÃƒÂ  droite, identique ÃƒÂ  celui des cartes Compteur (toucher le crayon ouvre la saisie d\'une hauteur). Changement de prÃƒÂ©sentation uniquement : les calculs, la saisie et le fonctionnement hors connexion sont inchangÃƒÂ©s. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.52.0 : Page Ã‚Â« RelevÃƒÂ©s Ã‚Â» (Gestion Eau) : les trois onglets passent ÃƒÂ  DEUX. L\'onglet Ã‚Â« Compteurs Ã‚Â» ne change pas (c\'est l\'eau qui sort, la consommation). Les anciens onglets Ã‚Â« Bassin Ã‚Â» et Ã‚Â« Apports Ã‚Â» fusionnent dans un seul nouvel onglet Ã‚Â« Source Ã‚Â» (l\'eau qui entre et le stock disponible). Dans Ã‚Â« Source Ã‚Â», du haut vers le bas : la carte Ã‚Â« Stock d\'eau du bassin Ã‚Â» (le niveau disponible et l\'ÃƒÂ©cart attendu/mesurÃƒÂ©), la carte Ã‚Â« Bassin Ã‚Â» (boutons Saisir hauteur / Historique), puis l\'eau qui rentre Ã¢â‚¬â€ d\'abord les Apports (total apportÃƒÂ© sur la pÃƒÂ©riode, bouton Ã‚Â« Ajouter un apport Ã‚Â», liste) puis la section dÃƒÂ©pliable Ã‚Â« Tests de dÃƒÂ©bit Ã‚Â» (dÃƒÂ©bit des pompes) Ã¢â‚¬â€ et enfin la section d\'administration Ã‚Â« RelevÃƒÂ©s rÃƒÂ©cents Ã‚Â» (correction/suppression + recalcul des bilans). Tous les raccourcis et liens existants continuent de fonctionner : Ã‚Â« Saisir bassin Ã‚Â» et Ã‚Â« Ajouter un apport Ã‚Â» ouvrent le bon tiroir dans Ã‚Â« Source Ã‚Â», et les liens du tableau de bord ou d\'invitation arrivent au bon endroit. RÃƒÂ©organisation d\'affichage uniquement : aucun calcul, aucune donnÃƒÂ©e ni le fonctionnement hors connexion ne changent. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.51.6 : Gestion Eau, tiroir Ã‚Â« Saisir Ã‚Â» d\'un relevÃƒÂ© de compteur : la photo du compteur se prend dÃƒÂ©sormais via une petite icÃƒÂ´ne d\'appareil photo placÃƒÂ©e tout en haut ÃƒÂ  droite, sur la mÃƒÂªme ligne que le sÃƒÂ©lecteur Eau / Ãƒâ€°lec, au lieu du grand bouton Ã‚Â« Prendre / choisir une photo Ã‚Â» qui occupait toute la largeur. Toucher l\'icÃƒÂ´ne ouvre l\'appareil photo ou la galerie comme avant ; une fois la photo prise, son aperÃƒÂ§u (avec le bouton Ã‚Â« Retirer Ã‚Â») s\'affiche juste en dessous. Changement d\'aspect uniquement : la prise de photo, les calculs et le fonctionnement (y compris hors connexion) sont inchangÃƒÂ©s. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.51.4 : Gestion Eau, page RelevÃƒÂ©s : le bouton Ã‚Â« MODIFIER Ã‚Â» de l\'historique d\'un compteur (rÃƒÂ©servÃƒÂ© ÃƒÂ  l\'administrateur) permet dÃƒÂ©sormais de corriger aussi la DATE et l\'heure de chaque relevÃƒÂ©, en plus de l\'index et de la note. En mode modification, chaque relevÃƒÂ© affiche un champ Ã‚Â« date et heure Ã‚Â» : on peut le replacer au bon moment (une date dans le futur est refusÃƒÂ©e) ; ÃƒÂ  l\'enregistrement, la consommation est recalculÃƒÂ©e dans le bon ordre chronologique. Fonctionne pour l\'eau comme pour l\'ÃƒÂ©lectricitÃƒÂ©, et hors connexion. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.51.3 : Gestion Eau, page RelevÃƒÂ©s. Dans l\'historique d\'un compteur, le bouton Ã‚Â« MODIFIER Ã‚Â» (rÃƒÂ©servÃƒÂ© ÃƒÂ  l\'administrateur) passe dÃƒÂ©sormais tout en bas du tiroir, sous la liste des relevÃƒÂ©s ; le sÃƒÂ©lecteur Eau/Ãƒâ€°lec, lui, reste en haut. Les boutons de correction adoptent une petite icÃƒÂ´ne Ã‚Â« bloc-notes avec crayon Ã‚Â» : sur Ã‚Â« MODIFIER Ã‚Â» et Ã‚Â« ENREGISTRER Ã‚Â» de l\'historique des compteurs, ainsi que sur le crayon de correction d\'un relevÃƒÂ© de niveau (onglet Bassin). Par ailleurs, le bouton Ã‚Â« Scan Ã‚Â» (QR de compteur) est dÃƒÂ©sormais intÃƒÂ©grÃƒÂ© ÃƒÂ  l\'intÃƒÂ©rieur de l\'onglet Compteurs au lieu d\'ÃƒÂªtre en haut de la page. Changements d\'aspect et de disposition uniquement : libellÃƒÂ©s, calculs et fonctionnement (y compris hors connexion) inchangÃƒÂ©s. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.51.2 : Gestion Eau, page RelevÃƒÂ©s (onglet Compteurs) : petit ajustement d\'alignement. Sur chaque carte de compteur, la ligne d\'infos (Eau Ã‚Â· date Ã‚Â· consommation) est dÃƒÂ©sormais alignÃƒÂ©e par le bas, sa base au niveau du bas du bouton crayon, au lieu d\'ÃƒÂªtre collÃƒÂ©e en haut. C\'est uniquement de l\'apparence : aucun calcul, libellÃƒÂ© ni fonctionnement (y compris hors connexion) n\'est modifiÃƒÂ©. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.51.1 : Gestion Eau, retouche d\'aspect des boutons Ã‚Â« Modifier Ã‚Â». Sur la page RelevÃƒÂ©s, le bouton Ã‚Â« MODIFIER Ã‚Â» (rÃƒÂ©servÃƒÂ© ÃƒÂ  l\'administrateur, dans l\'historique d\'un compteur) adopte dÃƒÂ©sormais le mÃƒÂªme pavÃƒÂ© bleu que le bouton Ã‚Â« Modifier Ã‚Â» des pages OpÃƒÂ©rations et PrÃƒÂªts de BazarKELY, pour une prÃƒÂ©sentation cohÃƒÂ©rente dans toute l\'application ; une fois la correction commencÃƒÂ©e, le bouton Ã‚Â« ENREGISTRER Ã‚Â» reste vert (pour bien le distinguer). Dans l\'onglet Bassin, le petit crayon de correction d\'un relevÃƒÂ© de niveau prend lui aussi l\'accent bleu. C\'est uniquement un changement d\'apparence : les libellÃƒÂ©s, les calculs et le fonctionnement (y compris hors connexion) sont inchangÃƒÂ©s. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.51.0 : Page RelevÃƒÂ©s (Gestion Eau) Ã¢â‚¬â€ finitions : un bouton crayon compact remplace le bouton Ã‚Â« Saisir Ã‚Â» pleine largeur sur chaque carte de compteur (onglet Compteurs) Ã¢â‚¬â€ il s\'affiche ÃƒÂ  droite de la ligne d\'infos (ou seul ÃƒÂ  droite pour un compteur jamais relevÃƒÂ©) ; toucher le crayon ouvre la saisie d\'un relevÃƒÂ©, toucher le reste de la carte ouvre l\'historique, comme avant. Dans l\'onglet Bassin, la carte Ã‚Â« Stock d\'eau du bassin Ã‚Â» devient cliquable : elle dÃƒÂ©plie un court texte Ã‚Â« Comprendre cette situation Ã‚Â» qui explique en mots simples ce que veulent dire les chiffres du moment (tout colle, un peu plus ou un peu moins d\'eau que prÃƒÂ©vu, ou bien il manque / il y a beaucoup trop d\'eau) avec un conseil d\'action ; les chiffres restent affichÃƒÂ©s. Affichage uniquement, aucun calcul modifiÃƒÂ©, application toujours utilisable hors connexion. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.50.2 : Suite du correctif de dÃƒÂ©filement des cartes Ã‚Â« Compteurs Ã‚Â» (Gestion Eau). Le glissement de la carte sous l\'en-tÃƒÂªte ÃƒÂ  l\'ouverture d\'un tiroir ne se dÃƒÂ©clenchait toujours pas : le dÃƒÂ©filement ÃƒÂ©tait demandÃƒÂ© trop tÃƒÂ´t (avant que la carte ne soit prÃƒÂªte ÃƒÂ  l\'ÃƒÂ©cran). Le dÃƒÂ©clenchement a ÃƒÂ©tÃƒÂ© dÃƒÂ©placÃƒÂ© au bon moment du cycle d\'affichage. DÃƒÂ©sormais, ouvrir Ã‚Â« Saisir Ã‚Â» ou Ã‚Â« Historique Ã‚Â» fait bien remonter la carte juste sous l\'en-tÃƒÂªte. Aucun autre changement. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.50.1 : Correctif du dÃƒÂ©filement des cartes Ã‚Â« Compteurs Ã‚Â» (Gestion Eau). Ãƒâ‚¬ l\'ouverture d\'un tiroir (Saisir ou Historique), la carte ne glissait pas jusque sous l\'en-tÃƒÂªte sur les pages du module : le dÃƒÂ©filement Ã‚Â« tout doux Ã‚Â» rÃƒÂ©glÃƒÂ© globalement empÃƒÂªchait l\'animation de se positionner. C\'est corrigÃƒÂ© : la carte se cale dÃƒÂ©sormais bien juste sous l\'en-tÃƒÂªte. Aucun autre changement. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.50.0 : Refonte des cartes de l\'onglet Ã‚Â« Compteurs Ã‚Â» (Gestion Eau). DÃƒÂ©sormais, toucher le corps d\'une carte de compteur ouvre directement son historique des relevÃƒÂ©s : le bouton Ã‚Â« Historique Ã‚Â» a ÃƒÂ©tÃƒÂ© retirÃƒÂ© (devenu inutile), seul le bouton Ã‚Â« Saisir Ã‚Â» subsiste pour noter un nouvel index. Quand on ouvre un tiroir (Saisir ou Historique), la carte glisse en douceur pour venir se placer juste sous l\'en-tÃƒÂªte, comme sur la page des opÃƒÂ©rations de BazarKELY, afin qu\'elle reste bien visible. NouveautÃƒÂ© rÃƒÂ©servÃƒÂ©e ÃƒÂ  l\'administrateur : dans l\'historique d\'un compteur, un bouton Ã‚Â« MODIFIER Ã‚Â» permet de corriger l\'index et la note des 6 derniers relevÃƒÂ©s (eau ou ÃƒÂ©lectricitÃƒÂ©, selon ce qui est affichÃƒÂ©). DÃƒÂ¨s qu\'on change un caractÃƒÂ¨re, le bouton devient Ã‚Â« ENREGISTRER Ã‚Â» ; aprÃƒÂ¨s enregistrement, la consommation est recalculÃƒÂ©e et un rappel invite ÃƒÂ  lancer Ã‚Â« Recalculer tous les bilans Ã‚Â» (onglet Bassin) pour mettre ÃƒÂ  jour le stock du bassin et les ÃƒÂ©carts. Un releveur ou un propriÃƒÂ©taire ne voit pas ce bouton. La carte du bassin conserve son libellÃƒÂ© Ã‚Â« Stock d\'eau du bassin Ã‚Â». MÃƒÂªmes calculs qu\'avant, application toujours utilisable hors connexion. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.49.1 : Renommage d\'affichage (Gestion Eau) : la carte Ã‚Â« Solde du bassin Ã‚Â» s\'intitule desormais Ã‚Â« Stock d\'eau du bassin Ã‚Â» (le terme Ã‚Â« solde Ã‚Â», herite du vocabulaire bancaire, ne convient pas a de l\'eau dans un reservoir). Affichage uniquement : aucun calcul ni fonctionnement modifie. (Detail precedent v3.49.0 : Estimation plus juste de l\'eau apportee au bassin (Gestion Eau). Jusqu\'ici, quand l\'apport d\'eau n\'etait pas saisi a la main, l\'application le deduisait du debit des pompes multiplie par la duree, ce qui le surestimait beaucoup : la pompe ne tourne pas en continu, elle remplit jusqu\'au flotteur puis s\'arrete et repart une dizaine de centimetres plus bas. Desormais, l\'apport est calcule de facon realiste a partir des niveaux du bassin et de la consommation (la pompe ne fait que compenser ce qui est sorti), sans jamais depasser le remplissage possible jusqu\'au flotteur. La carte Apports affiche maintenant cet apport estime, avec la mention estimation realiste (flotteur) ou estimation (debit) selon le cas, et le Solde du bassin utilise ce calcul plafonne (les ecarts redeviennent de vraies pertes, fini les valeurs aberrantes). Nouveau reglage facultatif en Configuration : Bande flotteur (cm) (defaut 10), la profondeur sous le flotteur a laquelle la pompe redemarre. Enfin, le test de debit se saisit desormais par hauteur + heure de debut et de fin (la duree est calculee toute seule) au lieu d\'une duree en minutes. Memes factures (basees sur les compteurs), application toujours utilisable hors connexion. (Detail precedent v3.48.1 : Correctif de cache : l\'application ne sert plus une ancienne version de la page apres une mise a jour (reglage du cache cote serveur Cloudflare + service worker). (Detail precedent v3.48.0 : Refonte de la page Ã‚Â« RelevÃƒÂ©s Ã‚Â» (Gestion Eau) Ã¢â‚¬â€ ÃƒÂ©tape 2 : les onglets Ã‚Â« Bassin Ã‚Â» et Ã‚Â« Apports Ã‚Â» adoptent la mÃƒÂªme prÃƒÂ©sentation en cartes que lÃ¢â‚¬â„¢onglet Compteurs. LÃ¢â‚¬â„¢onglet Ã‚Â« Bassin Ã‚Â» affiche en haut une carte Ã‚Â« Solde du bassin Ã‚Â» (le niveau dÃ¢â‚¬â„¢eau rÃƒÂ©ellement mesurÃƒÂ© et son pourcentage de remplissage, le niveau attendu dÃ¢â‚¬â„¢aprÃƒÂ¨s le dernier bilan et lÃ¢â‚¬â„¢ÃƒÂ©cart entre les deux, en orange si une anomalie est dÃƒÂ©tectÃƒÂ©e), puis une carte Ã‚Â« Bassin Ã‚Â» dÃ¢â‚¬â„¢oÃƒÂ¹ lÃ¢â‚¬â„¢on ouvre, dÃ¢â‚¬â„¢une touche, la saisie dÃ¢â‚¬â„¢une nouvelle hauteur (le volume en mÃ‚Â³ se calcule en direct ; enregistrer met ÃƒÂ  jour le solde et dÃƒÂ©clenche un bilan) ou lÃ¢â‚¬â„¢historique des 6 derniers niveaux. Une section dÃƒÂ©pliable Ã‚Â« Tests de dÃƒÂ©bit Ã‚Â» rappelle le dÃƒÂ©bit courant des pompes et permet dÃ¢â‚¬â„¢enregistrer un nouveau test. Le nouvel onglet Ã‚Â« Apports Ã‚Â» regroupe les entrÃƒÂ©es dÃ¢â‚¬â„¢eau dans le bassin : un indicateur du total apportÃƒÂ© sur la pÃƒÂ©riode choisie (7 j / 30 j / 1 an), un bouton Ã‚Â« Ajouter un apport Ã‚Â» (volume, note et date/heure facultative) et la liste des derniers apports. Les raccourcis du bas Ã‚Â« Saisir bassin Ã‚Â» et Ã‚Â« Ajouter apport Ã‚Â» ouvrent directement le bon onglet et le bon tiroir. Toutes les faÃƒÂ§ons dÃ¢â‚¬â„¢arriver ÃƒÂ  ces ÃƒÂ©crans depuis le tableau de bord ou un lien dÃ¢â‚¬â„¢invitation continuent de fonctionner comme avant, et la carte Ã‚Â« Conso ÃƒÂ©lectrique Ã‚Â» du tableau de bord ouvre dÃƒÂ©sormais directement la saisie dÃ¢â‚¬â„¢un relevÃƒÂ© ÃƒÂ©lectrique. Pour un compteur qui a ÃƒÂ  la fois de lÃ¢â‚¬â„¢eau et de lÃ¢â‚¬â„¢ÃƒÂ©lectricitÃƒÂ©, lÃ¢â‚¬â„¢historique propose un petit sÃƒÂ©lecteur Eau / Ãƒâ€°lec. MÃƒÂªmes calculs quÃ¢â‚¬â„¢avant ; lÃ¢â‚¬â„¢application reste utilisable hors connexion. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.47.1 : Correctif de connexion (toute lÃ¢â‚¬â„¢application). AprÃƒÂ¨s une expiration de session, lÃ¢â‚¬â„¢application pouvait refuser de rouvrir la session : au retour de Google, lÃ¢â‚¬â„¢ÃƒÂ©cran qui finalise la connexion ÃƒÂ©tait sautÃƒÂ© (un indicateur interne Ã‚Â« dÃƒÂ©jÃƒÂ  connectÃƒÂ© Ã‚Â» restait actif ÃƒÂ  tort), si bien que la connexion ne sÃ¢â‚¬â„¢ÃƒÂ©tablissait jamais et lÃ¢â‚¬â„¢espace eau affichait Ã‚Â« Reconnexion requise Ã‚Â» en boucle. DÃƒÂ©sormais, lorsquÃ¢â‚¬â„¢un retour de connexion Google est en attente, lÃ¢â‚¬â„¢application le finalise toujours, mÃƒÂªme si cet indicateur est pÃƒÂ©rimÃƒÂ©. Aucune donnÃƒÂ©e nÃ¢â‚¬â„¢est touchÃƒÂ©e et le fonctionnement normal (connexion, navigation, hors-ligne) est inchangÃƒÂ©. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.47.0 : Refonte de la page Ã‚Â« RelevÃƒÂ©s Ã‚Â» (Gestion Eau), faÃƒÂ§on page des opÃƒÂ©rations BazarKELY. La page sÃ¢â‚¬â„¢organise dÃƒÂ©sormais en trois onglets Ã¢â‚¬â€ Compteurs, Bassin, Apports Ã¢â‚¬â€ avec un bouton Ã‚Â« Scan Ã‚Â» intÃƒÂ©grÃƒÂ© directement ÃƒÂ  la page. LÃ¢â‚¬â„¢onglet Compteurs, entiÃƒÂ¨rement repensÃƒÂ©, affiche en haut deux indicateurs (la consommation dÃ¢â‚¬â„¢eau sur la pÃƒÂ©riode choisie et lÃ¢â‚¬â„¢avancement des relevÃƒÂ©s du jour, X/N), une barre de recherche (par nom, propriÃƒÂ©taire ou zone) et des filtres de pÃƒÂ©riode 7 j / 30 j / 1 an (mÃƒÂ©morisÃƒÂ©s). En dessous, chaque compteur est prÃƒÂ©sentÃƒÂ© sur une carte Ã¢â‚¬â€ eau et ÃƒÂ©lectricitÃƒÂ© rÃƒÂ©unis dans la mÃƒÂªme liste, repÃƒÂ©rÃƒÂ©s par une icÃƒÂ´ne (goutte pour lÃ¢â‚¬â„¢eau, ÃƒÂ©clair pour lÃ¢â‚¬â„¢ÃƒÂ©lectricitÃƒÂ©) Ã¢â‚¬â€ montrant le dernier index, sa date et la derniÃƒÂ¨re consommation (mÃ‚Â³ ou kWh). Les compteurs encore ÃƒÂ  relever aujourdÃ¢â‚¬â„¢hui (et ceux jamais relevÃƒÂ©s) remontent en haut, dans lÃ¢â‚¬â„¢ordre de la tournÃƒÂ©e. Chaque carte ouvre, dÃ¢â‚¬â„¢une touche, un tiroir Ã‚Â« Saisir Ã‚Â» (nouvel index, consommation calculÃƒÂ©e, alerte si valeur anormale, case Ã‚Â« compteur remis ÃƒÂ  zÃƒÂ©ro Ã‚Â», photo et note facultatives Ã¢â‚¬â€ au choix eau ou ÃƒÂ©lectricitÃƒÂ©) ou un tiroir Ã‚Â« Historique Ã‚Â» (les 6 derniers relevÃƒÂ©s et un petit graphique). Trois raccourcis en bas (Scanner, Saisir bassin, Ajouter apport) complÃƒÂ¨tent lÃ¢â‚¬â„¢ÃƒÂ©cran. La saisie du bassin (onglet Bassin) et le scan dÃ¢â‚¬â„¢un QR de compteur fonctionnent exactement comme avant ; lÃ¢â‚¬â„¢onglet Ã‚Â« Apports Ã‚Â» arrive prochainement. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.46.12 : Ãƒâ‚¬ la rÃƒÂ©ouverture, l\'application revient automatiquement sur le tableau de bord de votre dernier module utilisÃƒÂ© (Gestion Eau, Construction ou BazarKELY), y compris quand vous lancez l\'app installÃƒÂ©e depuis son icÃƒÂ´ne. Avant, l\'app installÃƒÂ©e s\'ouvrait toujours sur BazarKELY quel que soit le module quittÃƒÂ©. Ouvrir un lien direct, un signet ou rafraÃƒÂ®chir (F5) une adresse prÃƒÂ©cise vous y maintient toujours, comme avant ; seul un lancement Ã‚Â« neutre Ã‚Â» (icÃƒÂ´ne de l\'app ou page d\'accueil) dÃƒÂ©clenche cette reprise. Le dernier module est dÃƒÂ©sormais mÃƒÂ©morisÃƒÂ© que vous y entriez par le sÃƒÂ©lecteur ou par un lien direct. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.46.10 : Le releveur peut corriger un relevÃƒÂ© de niveau rÃƒÂ©cent (Gestion Eau). La section dÃƒÂ©pliable Ã‚Â« RelevÃƒÂ©s rÃƒÂ©cents Ã‚Â» de la saisie bassin (onglet Niveau), jusqu\'ici rÃƒÂ©servÃƒÂ©e ÃƒÂ  l\'administrateur, est dÃƒÂ©sormais aussi accessible au releveur Ã¢â‚¬â€ mais limitÃƒÂ©e aux relevÃƒÂ©s des derniÃƒÂ¨res 48 heures : il peut corriger la hauteur et la date/heure d\'un relevÃƒÂ© rÃƒÂ©cent, ou le supprimer, et les bilans concernÃƒÂ©s se recalculent tout seuls. Les relevÃƒÂ©s plus anciens ne s\'affichent pas pour le releveur (un message le lui rappelle) et le bouton Ã‚Â« Recalculer tous les bilans Ã‚Â» reste rÃƒÂ©servÃƒÂ© ÃƒÂ  l\'administrateur. L\'administrateur, lui, garde l\'accÃƒÂ¨s complet (tous les relevÃƒÂ©s, sans limite de temps) exactement comme avant. Cette limite des 48 heures est aussi appliquÃƒÂ©e cÃƒÂ´tÃƒÂ© serveur, pas seulement ÃƒÂ  l\'ÃƒÂ©cran. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.46.9 : Tableau de bord Gestion Eau : nouvelle carte Ã‚Â« Conso ÃƒÂ©lectrique Ã‚Â» (finitions ÃƒÂ©lectricitÃƒÂ©). Le tableau de bord affiche dÃƒÂ©sormais, ÃƒÂ  cÃƒÂ´tÃƒÂ© des indicateurs de l\'eau, la consommation ÃƒÂ©lectrique rÃƒÂ©cente (somme des derniÃƒÂ¨res consommations relevÃƒÂ©es par compteur, en kWh) ; tant qu\'aucun relevÃƒÂ© ÃƒÂ©lectrique n\'a ÃƒÂ©tÃƒÂ© saisi, la carte montre un ÃƒÂ©tat vide clair (Ã‚Â« Aucun relevÃƒÂ© ÃƒÂ©lectrique Ã¢â‚¬â€ appuyez pour saisir Ã‚Â») et la toucher ouvre directement la saisie des relevÃƒÂ©s ÃƒÂ©lectriques. Petite fiabilisation au passage : relever un compteur ÃƒÂ©lectrique avec exactement le mÃƒÂªme index que la fois prÃƒÂ©cÃƒÂ©dente (consommation nulle, par exemple un logement inoccupÃƒÂ©) ne dÃƒÂ©clenche plus de fausse alerte Ã‚Â« consommation anormalement basse Ã‚Â». Le reste du module (eau et ÃƒÂ©lectricitÃƒÂ©) est inchangÃƒÂ©. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.46.8 : Mise au point de la facture combinÃƒÂ©e eau + ÃƒÂ©lectricitÃƒÂ© (Gestion Eau) : le PDF affiche dÃƒÂ©sormais le logo AHUVI en en-tÃƒÂªte, les colonnes Ã‚Â« Prix unitaire Ã‚Â» et Ã‚Â« Total Ã‚Â» des tableaux ne se chevauchent plus pour les gros montants (la devise est rappelÃƒÂ©e dans l\'en-tÃƒÂªte de ces colonnes), et l\'encadrÃƒÂ© du calcul du prix du kWh (A : JIRAMA, B : gasoil, C : kWh, D = (A+B)/C) est prÃƒÂ©sentÃƒÂ© sur quatre lignes bien lisibles ; les montants et la pÃƒÂ©riode sont dÃƒÂ©sormais alignÃƒÂ©s proprement, sans dÃƒÂ©bordement ni troncature au bord droit. Le calcul et les montants sont inchangÃƒÂ©s. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.46.6 : Nouveau : facture combinÃƒÂ©e eau + ÃƒÂ©lectricitÃƒÂ© (Gestion Eau, ÃƒÂ©tape finale). Dans l\'ÃƒÂ©cran Ã‚Â« Facturation Ã‚Â», aprÃƒÂ¨s avoir choisi la pÃƒÂ©riode, on choisit aussi le Ã‚Â« mois de coÃƒÂ»ts ÃƒÂ©lectricitÃƒÂ© Ã‚Â» (qui fixe le prix du kWh) : chaque facture additionne dÃƒÂ©sormais une ligne EAU (consommation Ãƒâ€” tarif au mÃ‚Â³) et une ligne Ãƒâ€°LECTRICITÃƒâ€° (consommation Ãƒâ€” prix du kWh du mois choisi), avec un total gÃƒÂ©nÃƒÂ©ral. Une villa sans relevÃƒÂ© d\'un cÃƒÂ´tÃƒÂ© n\'est facturÃƒÂ©e que pour l\'autre. L\'aperÃƒÂ§u et la liste affichent le dÃƒÂ©tail eau / ÃƒÂ©lectricitÃƒÂ© / total. Le PDF de facture est entiÃƒÂ¨rement remodelÃƒÂ© (charte AHUVI) : logo, en-tÃƒÂªte propriÃƒÂ©taire + villa, deux tableaux (ÃƒÂ©lectricitÃƒÂ© et eau, avec index de dÃƒÂ©but/fin, consommation et prix unitaire), un encadrÃƒÂ© Ã‚Â« calcul du prix du kWh Ã‚Â» (A : facture JIRAMA, B : gasoil, C : kWh produits, D = (A+B)/C) pour la transparence, le grand total et le montant ÃƒÂ©crit en toutes lettres (Ã‚Â« Soit Ã¢â‚¬Â¦ Ariary Ã‚Â»). S\'il n\'y a pas encore de mois de coÃƒÂ»ts ÃƒÂ©lectricitÃƒÂ©, un message invite ÃƒÂ  les saisir d\'abord (menu Ã‚Â« CoÃƒÂ»ts ÃƒÂ©lectricitÃƒÂ© Ã‚Â») et seules les lignes d\'eau sont facturÃƒÂ©es. Le propriÃƒÂ©taire retrouve ce mÃƒÂªme PDF pour ses factures. Rien d\'autre ne change. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.46.5 : Nouveau : relevÃƒÂ© de l\'ÃƒÂ©lectricitÃƒÂ© par villa (Gestion Eau, 2Ã¡Âµâ€° ÃƒÂ©tape de la facture combinÃƒÂ©e eau + ÃƒÂ©lectricitÃƒÂ©). Dans l\'ÃƒÂ©cran Ã‚Â« RelevÃƒÂ©s Ã‚Â», un nouvel onglet Ã‚Â« Ãƒâ€°lectricitÃƒÂ© Ã‚Â» (icÃƒÂ´ne ÃƒÂ©clair) permet au releveur ou ÃƒÂ  l\'administrateur de noter l\'index du compteur Ãƒâ€°LECTRIQUE (en kWh) de chaque villa, exactement comme pour l\'eau : on cherche la villa (ce sont les mÃƒÂªmes que pour l\'eau), l\'app affiche le dernier index relevÃƒÂ© et sa date, on saisit le nouvel index, et la consommation (en kWh) s\'affiche aussitÃƒÂ´t. Comme pour l\'eau, l\'app prÃƒÂ©vient si l\'index saisi est plus bas que le prÃƒÂ©cÃƒÂ©dent (compteur remplacÃƒÂ© : Ã‚Â« rupture Ã‚Â») ou si la consommation paraÃƒÂ®t anormale, et demande confirmation ; on peut joindre une photo du compteur. Un petit graphique montre la consommation des derniers relevÃƒÂ©s. CÃƒÂ´tÃƒÂ© propriÃƒÂ©taire, l\'onglet Ã‚Â« Ma conso Ã‚Â» affiche dÃƒÂ©sormais, sous chaque compteur, une section Ã‚Â« Ãƒâ€°lectricitÃƒÂ© Ã‚Â» en lecture seule : dernier index kWh et historique de consommation (tant qu\'aucun relevÃƒÂ© ÃƒÂ©lectrique n\'existe, un message discret l\'indique). Le promoteur garde sa lecture seule ; rien d\'autre ne change. La facturation de l\'ÃƒÂ©lectricitÃƒÂ© avec l\'eau arrive aux ÃƒÂ©tapes suivantes. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.46.4 : Ã‚Â« CoÃƒÂ»ts ÃƒÂ©lectricitÃƒÂ© du mois Ã‚Â» (Gestion Eau, 1ÃŠÂ³Ã¡Âµâ€° ÃƒÂ©tape de la facture combinÃƒÂ©e eau + ÃƒÂ©lectricitÃƒÂ©). Un nouvel ÃƒÂ©cran (menu en haut ÃƒÂ  droite Ã¢â€ â€™ Ã‚Â« CoÃƒÂ»ts ÃƒÂ©lectricitÃƒÂ© Ã‚Â») permet ÃƒÂ  l\'administrateur d\'enregistrer, pour chaque mois, le coÃƒÂ»t de l\'ÃƒÂ©lectricitÃƒÂ© de la centrale : (A) la facture JIRAMA, (B) le gasoil du groupe ÃƒÂ©lectrogÃƒÂ¨ne et (C) le nombre total de kWh produits. L\'application en dÃƒÂ©duit aussitÃƒÂ´t (D) le prix d\'un kWh = (A + B) ÃƒÂ· C, affichÃƒÂ© en direct pendant la saisie puis conservÃƒÂ©. On peut ajouter plusieurs mois, les modifier ou les supprimer ; rÃƒÂ©-enregistrer un mois met simplement ÃƒÂ  jour ses chiffres (jamais de doublon). Si le total de kWh n\'est pas encore connu, le prix n\'est pas calculÃƒÂ© (un message le rappelle). Le promoteur et le releveur peuvent consulter cet ÃƒÂ©cran en lecture seule ; un propriÃƒÂ©taire n\'y a pas accÃƒÂ¨s. Cette ÃƒÂ©tape pose aussi, en coulisses, de quoi relever les compteurs ÃƒÂ©lectriques et joindre l\'ÃƒÂ©lectricitÃƒÂ© aux factures (volets prÃƒÂ©vus aux ÃƒÂ©tapes suivantes) ; rien d\'autre ne change dans l\'application. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.46.3 : Correctif (Gestion Eau) : le lien Ã‚Â« Aller ÃƒÂ  la configuration Ã‚Â» de la page Facturation ouvre dÃƒÂ©sormais directement la page Configuration. Avant, ce lien rechargeait toute l\'application et, le temps que vos droits d\'administrateur soient reconnus, vous ÃƒÂ©tiez renvoyÃƒÂ© ailleurs ; il fonctionne maintenant comme une navigation interne (sans rechargement), exactement comme les autres boutons du module. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.46.2 : On dit dÃƒÂ©sormais Ã‚Â« PropriÃƒÂ©taire Ã‚Â» au lieu de Ã‚Â« Client Ã‚Â» (Gestion Eau). Dans tout le module Eau, le mot affichÃƒÂ© Ã‚Â« Client Ã‚Â» est remplacÃƒÂ© par Ã‚Â« PropriÃƒÂ©taire Ã‚Â» : la case du rÃƒÂ´le lors d\'une invitation et de la validation d\'une demande, les badges, l\'ÃƒÂ©cran Ã‚Â« Utilisateurs Ã‚Â» (Ã‚Â« Comptes propriÃƒÂ©taires Ã‚Â», Ã‚Â« Nouveau compte propriÃƒÂ©taire Ã‚Â»Ã¢â‚¬Â¦), les messages du scan de QR, le journal et les textes d\'aide. C\'est uniquement un changement de vocabulaire ÃƒÂ  l\'ÃƒÂ©cran : rien ne change dans le fonctionnement, les accÃƒÂ¨s, les rÃƒÂ´les ni les donnÃƒÂ©es Ã¢â‚¬â€ un propriÃƒÂ©taire accÃƒÂ¨de ÃƒÂ  son espace exactement comme avant. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.46.1 : Chiffres de consommation et de pertes du bassin plus rÃƒÂ©alistes (Gestion Eau, suite). Cet aprÃƒÂ¨s-midi, l\'affichage Ã‚Â« consommation estimÃƒÂ©e Ã‚Â» (tableau de bord et courbe) avait dÃƒÂ©jÃƒÂ  ÃƒÂ©tÃƒÂ© corrigÃƒÂ©. Cette mise ÃƒÂ  jour corrige aussi le calcul de fond (le Ã‚Â« moteur des bilans Ã‚Â») : jusqu\'ici il supposait que la pompe tournait sans arrÃƒÂªt, ce qui gonflait la consommation rÃƒÂ©seau estimÃƒÂ©e et les pertes. DÃƒÂ©sormais il tient compte du fait que la pompe se coupe quand le bassin est plein (elle ne tourne pas en continu). ConsÃƒÂ©quence : le chiffre Ã‚Â« Conso rÃƒÂ©seau (pÃƒÂ©riode) Ã‚Â» et les pertes affichÃƒÂ©es baissent vers des valeurs rÃƒÂ©alistes, et certaines fausses alertes d\'anomalie (dues ÃƒÂ  cette surestimation) disparaissent. La facturation (basÃƒÂ©e sur les compteurs) n\'est pas affectÃƒÂ©e. Note : pour appliquer ces nouveaux chiffres aux relevÃƒÂ©s DÃƒâ€°JÃƒâ‚¬ enregistrÃƒÂ©s, l\'administrateur lance une fois Ã‚Â« Recalculer tous les bilans Ã‚Â» (onglet Niveau de la saisie bassin) ; les nouveaux relevÃƒÂ©s sont dÃƒÂ©jÃƒÂ  calculÃƒÂ©s correctement. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.46.0 : Le propriÃƒÂ©taire peut voir la situation du bassin commun (Gestion Eau). Les propriÃƒÂ©taires (qui ne voyaient que Ã‚Â« Ma conso Ã‚Â» et Ã‚Â« Mes factures Ã‚Â») disposent dÃƒÂ©sormais d\'un nouvel onglet Ã‚Â« Le bassin Ã‚Â» : il affiche, EN LECTURE SEULE, le niveau d\'eau actuel du bassin commun, son pourcentage de remplissage, l\'autonomie estimÃƒÂ©e et la consommation du jour, ainsi qu\'une courbe du niveau sur 30 jours. C\'est une simple consultation : aucune saisie ni modification n\'est possible (le serveur lui-mÃƒÂªme empÃƒÂªche toute ÃƒÂ©criture sur les donnÃƒÂ©es du bassin). Les autres rÃƒÂ´les (administrateur, releveur, promoteur) et les ÃƒÂ©crans Ã‚Â« Ma conso Ã‚Â» / Ã‚Â« Mes factures Ã‚Â» ne changent pas. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.45.2 : Consommation estimÃƒÂ©e plus rÃƒÂ©aliste : on tient compte des coupures de pompe (Gestion Eau). Tant que les compteurs ne sont pas installÃƒÂ©s, la consommation d\'eau est estimÃƒÂ©e ÃƒÂ  partir du dÃƒÂ©bit des pompes et des niveaux du bassin. Mais quand le bassin est plein, la pompe se coupe toute seule (flotteur) : sur ces pÃƒÂ©riodes, supposer la pompe en marche continue gonflait l\'estimation (on voyait des journÃƒÂ©es ÃƒÂ  80Ã¢â‚¬â€œ140 mÃ‚Â³ alors que la vraie consommation tourne autour de 18 mÃ‚Â³/jour). DÃƒÂ©sormais, l\'application repÃƒÂ¨re les pÃƒÂ©riodes Ã‚Â« bassin plein / pompe coupÃƒÂ©e Ã‚Â» et y applique le rythme de consommation rÃƒÂ©ellement observÃƒÂ© quand le bassin se vidait, au lieu du dÃƒÂ©bit thÃƒÂ©orique. RÃƒÂ©sultat : le chiffre Ã‚Â« Consommation du jour Ã‚Â» du tableau de bord et la courbe Ã‚Â« Consommation estimÃƒÂ©e par jour Ã‚Â» (Tendances) Ã¢â‚¬â€ ainsi que la projection en pointillÃƒÂ©s Ã¢â‚¬â€ affichent enfin des valeurs rÃƒÂ©alistes, du mÃƒÂªme ordre que l\'autonomie estimÃƒÂ©e. Les pertes du rÃƒÂ©seau (~30 %) restent dÃƒÂ©duites, et dÃƒÂ¨s l\'installation des compteurs tout repasse sur la consommation rÃƒÂ©ellement mesurÃƒÂ©e. Le calcul des bilans, des pertes (NRW) et de la Ã‚Â« Conso rÃƒÂ©seau (pÃƒÂ©riode) Ã‚Â» n\'est pas modifiÃƒÂ©. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.45.0 : Inviter un Ã‚Â« promoteur Ã‚Â» (Gestion Eau). Le formulaire Ã‚Â« Nouvelle invitation Ã‚Â» (ÃƒÂ©cran Invitations & demandes) propose dÃƒÂ©sormais le rÃƒÂ´le Promoteur, en plus d\'Administrateur, Releveur et Client Ã¢â‚¬â€ aussi bien pour une invitation par email que par lien WhatsApp. On peut donc inviter quelqu\'un qui pourra TOUT consulter dans l\'espace eau (en lecture seule) et rÃƒÂ©gler les seuils d\'alerte, sans rien pouvoir modifier d\'autre. DÃƒÂ¨s que la personne invitÃƒÂ©e se connecte, son accÃƒÂ¨s Ã‚Â« promoteur Ã‚Â» s\'active tout seul (comme pour les autres rÃƒÂ´les). Les invitations dÃƒÂ©jÃƒÂ  envoyÃƒÂ©es affichent une pastille Ã‚Â« Promoteur Ã‚Â», et lorsqu\'on valide une demande d\'accÃƒÂ¨s reÃƒÂ§ue on peut aussi y attribuer le rÃƒÂ´le Promoteur. Les invitations Administrateur / Releveur / Client fonctionnent exactement comme avant. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.44.2 : Conso du jour : le trait pointillÃƒÂ© de Ã‚Â« projection Ã‚Â» s\'affiche dÃƒÂ©sormais aussi tÃƒÂ´t le matin (Gestion Eau). Petit ajustement d\'affichage : sur la page Tendances, le segment en pointillÃƒÂ©s Ã‚Â« projection (relevÃƒÂ©s en attente) Ã‚Â» qui prolonge la courbe jusqu\'ÃƒÂ  aujourd\'hui apparaÃƒÂ®t maintenant correctement mÃƒÂªme dans les toutes premiÃƒÂ¨res heures de la journÃƒÂ©e (avant, ÃƒÂ  cause du dÃƒÂ©calage d\'heure, il ne se montrait qu\'ÃƒÂ  partir du milieu de matinÃƒÂ©e). Le tableau de bord et le calcul de la consommation estimÃƒÂ©e sont inchangÃƒÂ©s. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.44.1 : Consommation du jour : ne reste plus ÃƒÂ  zÃƒÂ©ro quand un relevÃƒÂ© manque (Gestion Eau). Sur le tableau de bord, le chiffre Ã‚Â« Consommation du jour Ã‚Â» et, sur la page Tendances, la courbe Ã‚Â« Consommation par jour Ã‚Â» pouvaient retomber ÃƒÂ  zÃƒÂ©ro les jours oÃƒÂ¹ aucun relevÃƒÂ© de niveau n\'avait encore ÃƒÂ©tÃƒÂ© saisi Ã¢â‚¬â€ alors que l\'eau continue d\'ÃƒÂªtre consommÃƒÂ©e. DÃƒÂ©sormais, tant qu\'il n\'y a pas de compteurs, l\'application ESTIME la consommation au lieu d\'afficher zÃƒÂ©ro : si les relevÃƒÂ©s tardent, elle prolonge la tendance des 3 derniers jours (le chiffre du jour monte progressivement au fil des heures) et la courbe se prolonge jusqu\'ÃƒÂ  aujourd\'hui par un trait en pointillÃƒÂ©s Ã‚Â« projection (relevÃƒÂ©s en attente) Ã‚Â». Une absence de relevÃƒÂ© n\'est donc plus prise pour une consommation nulle. L\'estimation tient compte d\'environ 30 % de pertes du rÃƒÂ©seau (ÃƒÂ©vaporation + fuites entre le bassin et les villas), et une petite mention sous le chiffre prÃƒÂ©cise son origine (Ã‚Â« estimÃƒÂ©e (tendanceÃ¢â‚¬Â¦) Ã‚Â», Ã‚Â« estimÃƒÂ©e (moyenne pÃƒÂ©riode) Ã‚Â»Ã¢â‚¬Â¦). Seule exception : si des compteurs existent et indiquent rÃƒÂ©ellement zÃƒÂ©ro, le zÃƒÂ©ro est conservÃƒÂ© (Ã‚Â« mesurÃƒÂ©e (compteurs ÃƒÂ  0) Ã‚Â») Ã¢â‚¬â€ on ne projette jamais par-dessus une vraie mesure. DÃƒÂ¨s l\'installation des compteurs, tout repasse automatiquement sur la consommation rÃƒÂ©ellement mesurÃƒÂ©e, sans pertes estimÃƒÂ©es. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.44.0 : Nouveau rÃƒÂ´le Ã‚Â« Promoteur Ã‚Â» (Gestion Eau). L\'administrateur peut dÃƒÂ©sormais dÃƒÂ©signer une personne comme Ã‚Â« promoteur Ã‚Â» : une nouvelle case Ã‚Â« Promoteur Ã‚Â» apparaÃƒÂ®t ÃƒÂ  cÃƒÂ´tÃƒÂ© de Ã‚Â« Administrateur Ã‚Â» et Ã‚Â« Releveur Ã‚Â» dans l\'ÃƒÂ©cran Ã‚Â« Utilisateurs & rÃƒÂ´les Ã‚Â». Le promoteur voit TOUT l\'espace eau Ã¢â‚¬â€ tableau de bord, relevÃƒÂ©s, suivi, compteurs et facturation (y compris TOUTES les factures), ainsi que les ÃƒÂ©crans d\'administration (configuration, utilisateurs, demandes, alertes, annonces, journal) Ã¢â‚¬â€ mais uniquement en LECTURE : aucun bouton de saisie, de modification, de suppression, de validation, de gÃƒÂ©nÃƒÂ©ration ou de marquage ne lui est proposÃƒÂ©, et un petit repÃƒÂ¨re Ã‚Â« Lecture seule (promoteur) Ã‚Â» le rappelle sur chaque ÃƒÂ©cran. SEULE exception : dans la Configuration, le promoteur peut rÃƒÂ©gler les seuils d\'alerte (pourcentage et mÃ‚Â³ d\'ÃƒÂ©cart, facteur de relevÃƒÂ© aberrant, jours sans relevÃƒÂ©, bassin critique, ÃƒÂ©cart de dÃƒÂ©bit) ; tous les autres rÃƒÂ©glages lui restent en lecture seule. Les rÃƒÂ´les existants (administrateur, releveur, client/propriÃƒÂ©taire) ne changent en rien : l\'administrateur ÃƒÂ©crit partout comme avant. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.43.2 : Consommation estimÃƒÂ©e par le dÃƒÂ©bit des pompes (Gestion Eau). Tant que les compteurs d\'eau ne sont pas installÃƒÂ©s, le graphique Ã‚Â« Consommation par jour Ã‚Â» (Suivi Ã¢â€ â€™ Tendances) et le chiffre Ã‚Â« consommation du jour Ã‚Â» (tableau de bord) restaient ÃƒÂ  zÃƒÂ©ro, faute de relevÃƒÂ©s de compteurs. DÃƒÂ©sormais, l\'application affiche une consommation ESTIMÃƒâ€°E dÃƒÂ©duite du dÃƒÂ©bit des pompes : tant que la pompe tourne, l\'eau apportÃƒÂ©e Ã¢â€°Ë† dÃƒÂ©bit Ãƒâ€” durÃƒÂ©e, et la consommation Ã¢â€°Ë† apport Ã¢Ë†â€™ variation du niveau du bassin (les fuites et l\'ÃƒÂ©vaporation sont nÃƒÂ©gligÃƒÂ©es). Sur la page Tendances, la courbe s\'intitule alors Ã‚Â« Consommation estimÃƒÂ©e par jour Ã‚Â» avec une petite ÃƒÂ©tiquette Ã‚Â« estimÃƒÂ©e (dÃƒÂ©bit) Ã‚Â» et une aide dÃƒÂ©pliable qui explique le calcul ; sur le tableau de bord, le chiffre du jour porte la mention Ã‚Â« estimÃƒÂ©e (dÃƒÂ©bit) Ã‚Â». Si aucun test de dÃƒÂ©bit n\'a encore ÃƒÂ©tÃƒÂ© enregistrÃƒÂ©, un message invite ÃƒÂ  en faire un (onglet DÃƒÂ©bit de la saisie bassin). DÃƒÂ¨s qu\'un seul relevÃƒÂ© de compteur existe, tout rebascule AUTOMATIQUEMENT sur la consommation rÃƒÂ©ellement mesurÃƒÂ©e (la courbe redevient Ã‚Â« Consommation mÃƒÂ©trÃƒÂ©e par jour Ã‚Â», sans la mention Ã‚Â« estimÃƒÂ©e Ã‚Â»). Aucun chiffre n\'est enregistrÃƒÂ© : l\'estimation est recalculÃƒÂ©e ÃƒÂ  l\'affichage. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.43.1 : Correctif d\'affichage des graphiques (Gestion Eau). Les pages avec courbes Ã¢â‚¬â€ la courbe Ã‚Â« Niveau du bassin Ã‚Â» (Saisie bassin Ã¢â€ â€™ onglet Niveau) et la page Tendances Ã¢â‚¬â€ pouvaient planter et afficher un ÃƒÂ©cran d\'erreur ÃƒÂ  cause d\'une animation d\'apparition des graphiques qui tournait en boucle. L\'animation d\'apparition est dÃƒÂ©sormais dÃƒÂ©sactivÃƒÂ©e sur tous les graphiques du module Eau : les courbes, aires et barres s\'affichent exactement comme avant (mÃƒÂªmes chiffres, mÃƒÂªmes couleurs), simplement sans l\'effet d\'apparition, et les pages ne plantent plus. Aucun autre changement. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.43.0 : Mises ÃƒÂ  jour automatiques et propres de l\'application (sur tÃƒÂ©lÃƒÂ©phone comme sur ordinateur). DÃƒÂ©sormais, quand une nouvelle version est publiÃƒÂ©e, l\'application l\'installe et l\'applique TOUTE SEULE : plus de bouton Ã‚Â« Actualiser Ã‚Â» ÃƒÂ  chercher, plus de manipulations, et surtout plus de Ã‚Â« rÃƒÂ©sidus Ã‚Â» de l\'ancienne version qui obligeaient parfois ÃƒÂ  se dÃƒÂ©connecter ou ÃƒÂ  quitter l\'application. ConcrÃƒÂ¨tement, dÃƒÂ¨s qu\'une nouvelle version est prÃƒÂªte, l\'app active le nouveau moteur, efface les anciens fichiers en cache (SANS jamais toucher ÃƒÂ  vos donnÃƒÂ©es ni ÃƒÂ  vos saisies en attente d\'envoi hors-ligne) puis se recharge automatiquement ; un petit message Ã‚Â« Application mise ÃƒÂ  jour Ã¢Å“â€¦ Ã‚Â» le confirme. Note importante : cette amÃƒÂ©lioration s\'installe AVEC la prÃƒÂ©sente version Ã¢â‚¬â€ sur un appareil qui a encore l\'ancienne version, il faut une derniÃƒÂ¨re mise ÃƒÂ  jour Ã‚Â« ÃƒÂ  l\'ancienne Ã‚Â» (relancer l\'application, ou se reconnecter) pour rÃƒÂ©cupÃƒÂ©rer ce nouveau systÃƒÂ¨me ; ensuite, toutes les mises ÃƒÂ  jour suivantes seront automatiques. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.42.0 : Photos du domaine sur la page de prÃƒÂ©sentation Ã‚Â« lien dÃƒÂ©jÃƒÂ  utilisÃƒÂ© Ã‚Â» (Gestion Eau). Les trois emplacements photo de cette page affichent dÃƒÂ©sormais de vraies images du domaine Itampolo Resort : le practice de golf (Ã‚Â« Le parcours de golf prend forme. Ã‚Â»), les RÃƒÂ©sidences (Ã‚Â« Les RÃƒÂ©sidences, pensÃƒÂ©es pour durer. Ã‚Â») et les villas avec piscine (Ã‚Â« Les villas du domaine prennent vie. Ã‚Â»). Tant qu\'une image n\'est pas encore chargÃƒÂ©e, l\'icÃƒÂ´ne de repÃƒÂ¨re reste affichÃƒÂ©e sur le fond vert ; dÃƒÂ¨s que la photo arrive, elle la recouvre. Aucun autre changement. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.41.0 : Modifier ou supprimer un relevÃƒÂ© de niveau du bassin (Gestion Eau, rÃƒÂ©servÃƒÂ© ÃƒÂ  l\'administrateur). Sous l\'onglet Ã‚Â« Niveau Ã‚Â» de la saisie bassin, une nouvelle section dÃƒÂ©pliable Ã‚Â« RelevÃƒÂ©s rÃƒÂ©cents (admin) Ã‚Â» liste les derniers relevÃƒÂ©s (date, hauteur, volume). L\'administrateur peut corriger un relevÃƒÂ© (changer la hauteur et/ou la date-heure) ou le supprimer ; ÃƒÂ  chaque fois, les bilans concernÃƒÂ©s sont recalculÃƒÂ©s automatiquement. Un bilan compare deux relevÃƒÂ©s qui se suivent (niveau prÃƒÂ©cÃƒÂ©dent Ã¢â€ â€™ niveau actuel) pour estimer la consommation et les pertes : modifier un relevÃƒÂ© ne touche donc qu\'au bilan de ce relevÃƒÂ© et ÃƒÂ  celui du relevÃƒÂ© suivant ; les autres bilans (et leur ÃƒÂ©tat Ã‚Â« traitÃƒÂ© Ã‚Â») restent intacts. Un bouton Ã‚Â« Recalculer tous les bilans Ã‚Â» refait toute la sÃƒÂ©rie depuis le dÃƒÂ©but (utile une seule fois pour gÃƒÂ©nÃƒÂ©rer les bilans de relevÃƒÂ©s importÃƒÂ©s). Ces actions exigent une connexion : hors ligne, les boutons sont dÃƒÂ©sactivÃƒÂ©s. Cette section n\'apparaÃƒÂ®t QUE pour un administrateur ; un releveur ne la voit pas et ne peut pas modifier ni supprimer un relevÃƒÂ©. Bonus : enregistrer un relevÃƒÂ© ÃƒÂ  une date passÃƒÂ©e met aussi ÃƒÂ  jour le bilan du relevÃƒÂ© qui le suit. La saisie normale d\'un relevÃƒÂ© reste exactement comme avant. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.40.1 : Correctif d\'affichage de la page de prÃƒÂ©sentation Ã‚Â« lien dÃƒÂ©jÃƒÂ  utilisÃƒÂ© Ã‚Â» (Gestion Eau, Ãƒâ€°VO 2). Sur les emplacements des photos du domaine pas encore ajoutÃƒÂ©es, l\'icÃƒÂ´ne de repÃƒÂ¨re s\'affiche dÃƒÂ©sormais systÃƒÂ©matiquement sur le fond vert AHUVI ; auparavant, selon l\'hÃƒÂ©bergement, le fond pouvait rester vide (sans l\'icÃƒÂ´ne) parce qu\'un emplacement de photo manquant renvoie une page technique au lieu d\'une vraie Ã‚Â« image absente Ã‚Â». DÃƒÂ¨s que les vraies photos seront ajoutÃƒÂ©es, elles recouvrent l\'icÃƒÂ´ne et s\'affichent normalement. Aucun autre changement. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.40.0 : Nouvel ÃƒÂ©cran quand un lien d\'invitation a dÃƒÂ©jÃƒÂ  servi (Gestion Eau). Jusqu\'ici, ouvrir un lien d\'invitation Ã‚Â« 1sakely.org/i/Ã¢â‚¬Â¦ Ã‚Â» dÃƒÂ©jÃƒÂ  utilisÃƒÂ© (ou expirÃƒÂ©, rÃƒÂ©voquÃƒÂ©, inconnu) menait ÃƒÂ  un simple message d\'erreur. DÃƒÂ©sormais, une vraie page de prÃƒÂ©sentation s\'affiche : un mot doux rappelle que le lien a dÃƒÂ©jÃƒÂ  servi, puis la page prÃƒÂ©sente le domaine Itampolo Resort ÃƒÂ  Nosy Be (le golf, la centrale solaire, le ponton, les RÃƒÂ©sidences) avec quelques photos, explique en deux courts paragraphes pourquoi l\'eau y est suivie avec soin, donne quatre astuces d\'utilisation, et propose enfin une petite fiche Ã‚Â« Demander un accÃƒÂ¨s Ã‚Â» (nom, numÃƒÂ©ro WhatsApp, email facultatif, fonction, message facultatif). En validant la fiche, on se connecte avec le compte Google de son choix et la demande part vers l\'administrateur Ã¢â‚¬â€ aucun lien dÃƒÂ©jÃƒÂ  utilisÃƒÂ© n\'est rÃƒÂ©employÃƒÂ©. Si le lien est encore valide, l\'ÃƒÂ©cran d\'inscription habituel reste exactement le mÃƒÂªme qu\'avant. Les photos du domaine apparaÃƒÂ®tront dÃƒÂ¨s qu\'elles seront ajoutÃƒÂ©es ; en attendant, la page reste ÃƒÂ©lÃƒÂ©gante (fond vert AHUVI). Hors connexion, l\'application reste prudente et montre cette page de prÃƒÂ©sentation plutÃƒÂ´t qu\'une inscription qui pourrait ne pas aboutir. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.39.0 : Inviter plusieurs personnes d\'un coup depuis le rÃƒÂ©pertoire du tÃƒÂ©lÃƒÂ©phone (Gestion Eau). Sur l\'ÃƒÂ©cran Ã‚Â« Invitations & demandes Ã‚Â», un administrateur peut maintenant appuyer sur Ã‚Â« Importer du rÃƒÂ©pertoire Ã‚Â» pour choisir plusieurs contacts dans le carnet d\'adresses de son tÃƒÂ©lÃƒÂ©phone : le nom et le numÃƒÂ©ro WhatsApp de chacun sont remplis tout seuls (l\'adresse email aussi si elle existe), sans saisie une par une. On choisit ensuite un rÃƒÂ´le commun (Releveur ou Administrateur) et une durÃƒÂ©e de validitÃƒÂ© commune (7, 30, 90 jours ou illimitÃƒÂ©), on peut corriger le nom/numÃƒÂ©ro ou retirer une ligne, puis Ã‚Â« CrÃƒÂ©er les invitations Ã‚Â» fabrique tous les liens d\'invitation d\'un coup. L\'application affiche alors la liste Ã‚Â« Liens prÃƒÂªts ÃƒÂ  envoyer Ã‚Â» : pour chaque personne, un bouton Ã‚Â« Envoyer sur WhatsApp Ã‚Â» ouvre WhatsApp avec le message et le lien tout prÃƒÂªts, et un bouton Ã‚Â« Copier le lien Ã‚Â». WhatsApp s\'ouvre un contact ÃƒÂ  la fois (l\'envoi groupÃƒÂ© automatique n\'existe pas gratuitement) : on touche Ã‚Â« Envoyer Ã‚Â» pour chacun. Cette fonction n\'existe que sur Android (Chrome) ; sur iPhone ou ordinateur, le bouton est affichÃƒÂ© mais dÃƒÂ©sactivÃƒÂ© avec la mention Ã‚Â« Disponible sur Android (Chrome) Ã‚Â», et tout le reste de l\'ÃƒÂ©cran (invitation ÃƒÂ  l\'unitÃƒÂ© par email ou par lien WhatsApp, validation des demandes reÃƒÂ§ues) fonctionne exactement comme avant. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.38.0 : PrÃƒÂ©paration (invisible) du prochain ÃƒÂ©cran d\'invitation par lien (Gestion Eau). Deux briques sont posÃƒÂ©es cÃƒÂ´tÃƒÂ© serveur, sans rien changer ÃƒÂ  ce que vous voyez aujourd\'hui : (1) l\'application sait dÃƒÂ©sormais demander si un lien d\'invitation Ã‚Â« 1sakely.org/i/Ã¢â‚¬Â¦ Ã‚Â» est encore utilisable ou non (dÃƒÂ©jÃƒÂ  utilisÃƒÂ©, expirÃƒÂ©, rÃƒÂ©voquÃƒÂ©, ou inconnu) Ã¢â‚¬â€ sans dÃƒÂ©voiler aucune information personnelle ; le futur ÃƒÂ©cran d\'accueil du lien s\'en servira pour proposer l\'inscription seulement quand le lien est valide, et afficher une page de prÃƒÂ©sentation sinon. (2) La future fiche d\'accÃƒÂ¨s pourra recueillir, en plus du nom et de l\'email, le numÃƒÂ©ro WhatsApp, la fonction et un message libre : ces informations seront jointes ÃƒÂ  la demande d\'accÃƒÂ¨s envoyÃƒÂ©e ÃƒÂ  l\'administrateur. Hors connexion, l\'application reste prudente (elle considÃƒÂ¨re un lien comme Ã‚Â« non vÃƒÂ©rifiable Ã‚Â» plutÃƒÂ´t que de proposer une inscription trompeuse). Les ÃƒÂ©crans correspondants arrivent aux ÃƒÂ©tapes suivantes. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.37.1 : AperÃƒÂ§u WhatsApp recentrÃƒÂ© : l\'image qui s\'affiche quand on partage un lien d\'invitation Ã‚Â« 1sakely.org/i/Ã¢â‚¬Â¦ Ã‚Â» est dÃƒÂ©sormais composÃƒÂ©e bien au centre, pour qu\'elle reste entiÃƒÂ¨rement lisible mÃƒÂªme quand WhatsApp la recadre en carrÃƒÂ© dans le fil de discussion. Avant, le grand pourcentage (par exemple Ã‚Â« 76 % Ã‚Â») et les textes ÃƒÂ©taient calÃƒÂ©s ÃƒÂ  gauche : WhatsApp rognait les bords et on ne voyait plus que Ã‚Â« % Ã‚Â». Tout (le pourcentage, Ã‚Â« Niveau du bassin Ã‚Â», la goutte Ã‚Â« Gestion Eau AHUVI Ã‚Â», la pastille de tendance et le bandeau d\'invitation) est maintenant ramenÃƒÂ© dans une zone centrale de sÃƒÂ©curitÃƒÂ© et ne se fait plus couper. Pour que WhatsApp affiche bien la nouvelle image (il garde les aperÃƒÂ§us en mÃƒÂ©moire), il faut tester avec un NOUVEAU lien d\'invitation. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.37.0 : AperÃƒÂ§u WhatsApp du lien d\'invitation (Gestion Eau) Ã¢â‚¬â€ Phase 5 (finale). DÃƒÂ©sormais, quand on colle un lien d\'invitation Ã‚Â« 1sakely.org/i/Ã¢â‚¬Â¦ Ã‚Â» dans WhatsApp, un bel aperÃƒÂ§u s\'affiche tout seul : une grande image aux couleurs AHUVI montrant le niveau actuel du bassin (en pourcentage, avec sa tendance) et le titre Ã‚Â« Gestion Eau AHUVI Ã‚Â», accompagnÃƒÂ©e d\'un court texte d\'invitation en franÃƒÂ§ais. En touchant l\'aperÃƒÂ§u, on ouvre la page d\'accueil du lien, comme avant. Jusqu\'ici WhatsApp n\'affichait qu\'un lien nu, sans image ni texte, car il ne sait pas Ã‚Â« lire Ã‚Â» l\'application : l\'aperÃƒÂ§u est maintenant prÃƒÂ©parÃƒÂ© cÃƒÂ´tÃƒÂ© serveur au moment du partage. Si les chiffres ne sont pas disponibles, l\'image reste prÃƒÂ©sentable avec un message gÃƒÂ©nÃƒÂ©ral. Ãƒâ‚¬ savoir : WhatsApp garde en mÃƒÂ©moire l\'aperÃƒÂ§u d\'un lien pendant plusieurs jours Ã¢â‚¬â€ comme chaque invitation a son propre lien, l\'aperÃƒÂ§u est juste au premier partage et ne change plus ensuite pour ce mÃƒÂªme lien (sans importance : un lien = une personne). (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.36.0 : Invitation par lien WhatsApp (Gestion Eau) Ã¢â‚¬â€ Phase 4 (ÃƒÂ©cran pour crÃƒÂ©er et gÃƒÂ©rer les liens). L\'administrateur peut dÃƒÂ©sormais, depuis l\'onglet Ã‚Â« Invitations & demandes Ã‚Â» du module Eau, inviter quelqu\'un de DEUX faÃƒÂ§ons au choix grÃƒÂ¢ce ÃƒÂ  deux onglets : Ã‚Â« Email Ã‚Â» (comme avant : on connaÃƒÂ®t l\'adresse Google de la personne) ou Ã‚Â« WhatsApp Ã‚Â» (nouveau : on n\'a que son numÃƒÂ©ro). En mode WhatsApp, on saisit le numÃƒÂ©ro, le nom (facultatif), le ou les rÃƒÂ´les (Administrateur / Releveur / Client Ã¢â‚¬â€ pour un client, on coche ses compteurs) et la durÃƒÂ©e de validitÃƒÂ© du lien (7, 30, 90 jours ou illimitÃƒÂ©). Ãƒâ‚¬ la crÃƒÂ©ation, l\'app gÃƒÂ©nÃƒÂ¨re un lien d\'invitation unique et secret Ã‚Â« 1sakely.org/i/... Ã‚Â» : un bouton Ã‚Â« Envoyer sur WhatsApp Ã‚Â» ouvre WhatsApp avec un message tout prÃƒÂªt contenant ce lien, et l\'on peut aussi Ã‚Â« Copier le lien Ã‚Â» ou Ã‚Â« Copier le message Ã‚Â». Contrairement ÃƒÂ  l\'email, AUCUNE adresse Google n\'est imposÃƒÂ©e : la personne ouvre le lien, voit le niveau du bassin, puis se connecte avec le compte Google de son choix Ã¢â‚¬â€ son accÃƒÂ¨s s\'active tout seul grÃƒÂ¢ce au lien. Une nouvelle liste Ã‚Â« Invitations par lien WhatsApp Ã‚Â» montre chaque lien envoyÃƒÂ© avec son statut (En attente / AcceptÃƒÂ©e / ExpirÃƒÂ©e), sa date d\'expiration, et les actions Renvoyer (mÃƒÂªme lien), Copier le lien et RÃƒÂ©voquer. L\'invitation par email et la validation des demandes reÃƒÂ§ues fonctionnent exactement comme avant. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.35.0 : Invitation par lien WhatsApp (Gestion Eau) Ã¢â‚¬â€ Phase 2 (page d\'accueil du lien). Quand l\'invitÃƒÂ© ouvre le lien d\'invitation reÃƒÂ§u par WhatsApp, il arrive dÃƒÂ©sormais sur une vraie page d\'accueil Ã‚Â« Gestion Eau AHUVI Ã‚Â», sans avoir besoin de se connecter : elle affiche le niveau actuel du bassin (en pourcentage, avec une flÃƒÂ¨che de tendance et la date du relevÃƒÂ©), explique en quelques mots ÃƒÂ  quoi sert l\'application (suivi de l\'eau en temps rÃƒÂ©el, 100 % gratuit, fonctionne mÃƒÂªme sans connexion) et propose un seul bouton Ã‚Â« Continuer avec Google Ã‚Â». En appuyant dessus, le lien secret est mÃƒÂ©morisÃƒÂ© puis la connexion Google dÃƒÂ©marre ; au retour, l\'accÃƒÂ¨s s\'active tout seul et l\'invitÃƒÂ© atterrit directement au bon endroit selon son rÃƒÂ´le (saisie du bassin pour un releveur/administrateur, espace personnel pour un client). Si les chiffres ne sont pas disponibles (hors connexion ou bassin non configurÃƒÂ©), la page affiche un message d\'accueil simple sans chiffre. Si le lien n\'est plus valable (dÃƒÂ©jÃƒÂ  utilisÃƒÂ© ou expirÃƒÂ©), un message clair l\'indique aprÃƒÂ¨s la connexion, sans bloquer ni renvoyer ailleurs. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.34.0 : Invitation par lien WhatsApp (Gestion Eau) Ã¢â‚¬â€ Phase 1 (socle). PrÃƒÂ©paration d\'un 2Ã¡Âµâ€° moyen d\'inviter quelqu\'un ÃƒÂ  l\'espace eau. Jusqu\'ici, pour donner un accÃƒÂ¨s, il fallait connaÃƒÂ®tre l\'adresse Google de la personne. DÃƒÂ©sormais l\'application sait aussi crÃƒÂ©er une invitation Ã‚Â« par lien Ã‚Â» : un lien d\'accÃƒÂ¨s unique et secret, que l\'administrateur pourra envoyer par WhatsApp en ne connaissant que le numÃƒÂ©ro de tÃƒÂ©lÃƒÂ©phone Ã¢â‚¬â€ sans l\'adresse Google d\'avance. Quand la personne ouvre ce lien puis se connecte avec le compte Google de son choix, son accÃƒÂ¨s (relevÃƒÂ©, administration ou espace client avec ses compteurs) s\'active tout seul grÃƒÂ¢ce au lien, quel que soit le compte utilisÃƒÂ©. Ãƒâ‚¬ cette ÃƒÂ©tape, seule la Ã‚Â« tuyauterie Ã‚Â» est posÃƒÂ©e (cÃƒÂ´tÃƒÂ© serveur et dans l\'application) ; l\'ÃƒÂ©cran pour crÃƒÂ©er ces liens et la page d\'accueil du lien arrivent aux ÃƒÂ©tapes suivantes. Un lien peut avoir une date d\'expiration et ne sert qu\'une seule fois. L\'invitation par adresse Google (dÃƒÂ©jÃƒÂ  en place) continue de fonctionner exactement comme avant, et l\'application reste utilisable hors connexion. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.33.0 : Invitation par email (Gestion Eau) Ã¢â‚¬â€ Phase 2 : l\'ÃƒÂ©cran pour gÃƒÂ©rer les invitations arrive dans l\'application. Depuis l\'onglet Ã‚Â« Invitations & demandes Ã‚Â» du module Eau, un administrateur peut maintenant inviter quelqu\'un en remplissant son nom, son adresse Google, son numÃƒÂ©ro WhatsApp et son rÃƒÂ´le (Administrateur, Releveur et/ou Client Ã¢â‚¬â€ pour un client, on choisit ses compteurs). Un bouton Ã‚Â« Envoyer sur WhatsApp Ã‚Â» ouvre WhatsApp avec un message tout prÃƒÂªt (lien d\'accÃƒÂ¨s direct + rappel d\'utiliser bien CETTE adresse Google) : il n\'y a plus qu\'ÃƒÂ  appuyer sur Envoyer. La liste des invitations envoyÃƒÂ©es (en attente / acceptÃƒÂ©es) permet de renvoyer le message ou de rÃƒÂ©voquer une invitation pas encore utilisÃƒÂ©e. Les demandes d\'accÃƒÂ¨s reÃƒÂ§ues continuent de se valider au mÃƒÂªme endroit. DÃƒÂ¨s que l\'invitÃƒÂ© se connecte avec l\'adresse Google indiquÃƒÂ©e, son accÃƒÂ¨s s\'active tout seul (Phase 1). (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.32.0 : Invitation par email (Gestion Eau) : un administrateur peut dÃƒÂ©sormais prÃƒÂ©-enregistrer une personne par son adresse Google et lui attribuer ÃƒÂ  l\'avance un rÃƒÂ´le (relevÃƒÂ© des compteurs, administration et/ou espace client avec ses compteurs). DÃƒÂ¨s que cette personne se connecte ÃƒÂ  BazarKELY avec l\'adresse Google invitÃƒÂ©e, son accÃƒÂ¨s au module Eau s\'active tout seul, sans validation manuelle Ã¢â‚¬â€ et si elle est invitÃƒÂ©e comme client, son espace et ses compteurs sont crÃƒÂ©ÃƒÂ©s automatiquement. (Pour l\'instant l\'invitation se dÃƒÂ©pose cÃƒÂ´tÃƒÂ© serveur ; l\'ÃƒÂ©cran pour gÃƒÂ©rer ces invitations depuis l\'application arrivera ÃƒÂ  l\'ÃƒÂ©tape suivante.) (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.31.4 : Correctif navigation (verrou de module) : rafraÃƒÂ®chir la page (F5 ou Shift+Ctrl+R) ou ouvrir directement l\'adresse d\'un module Ã¢â‚¬â€ Gestion Eau (/gestion-eau), Construction (/construction/Ã¢â‚¬Â¦) ou une page budget BazarKELY (/transactionsÃ¢â‚¬Â¦) Ã¢â‚¬â€ vous maintient dÃƒÂ©sormais EXACTEMENT lÃƒÂ  oÃƒÂ¹ vous ÃƒÂ©tiez, dans tous les cas. Avant, dans le bref instant oÃƒÂ¹ l\'application restaurait votre connexion au dÃƒÂ©marrage, l\'adresse pouvait ÃƒÂªtre remplacÃƒÂ©e par l\'ÃƒÂ©cran de connexion, et au retour vous ÃƒÂ©tiez renvoyÃƒÂ© au tableau de bord BazarKELY au lieu de votre module. DÃƒÂ©sormais l\'ÃƒÂ©cran de connexion s\'affiche sans changer l\'adresse, donc une fois la connexion restaurÃƒÂ©e vous restez sur votre module. Le seul moyen de changer de module reste le geste volontaire : logo en haut ÃƒÂ  gauche puis icÃƒÂ´ne de la barre du bas. Bonus : si vous vous connectez avec Google depuis un lien profond (par exemple /gestion-eau alors que vous ÃƒÂ©tiez dÃƒÂ©connectÃƒÂ©), vous revenez sur cette adresse aprÃƒÂ¨s connexion. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.31.3 : ouvrir ou rafraÃƒÂ®chir (F5) directement l\'adresse d\'un module (par exemple Gestion Eau /gestion-eau) vous y maintient dÃƒÂ©sormais, au lieu de vous renvoyer au tableau de bord BazarKELY. La reprise automatique Ã‚Â« revenir dans mon dernier module utilisÃƒÂ© Ã‚Â» est conservÃƒÂ©e, mais ne s\'applique plus que depuis l\'accueil neutre (/dashboard) : si vous arrivez par un lien, un signet ou un rechargement sur une adresse prÃƒÂ©cise, vous restez exactement lÃƒÂ . Le basculement de module via le logo en haut ÃƒÂ  gauche est inchangÃƒÂ©. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.31.2 : Tableau de bord Eau : l\'icÃƒÂ´ne d\'une carte bassin ouvre maintenant directement le bon onglet de saisie Ã¢â‚¬â€ Stock Ã¢â€ â€™ Niveau, EntrÃƒÂ©es Ã¢â€ â€™ EntrÃƒÂ©e, DÃƒÂ©bit Ã¢â€ â€™ DÃƒÂ©bit. Avant, on tombait toujours sur Niveau quelle que soit la carte touchÃƒÂ©e. Les cartes compteur et le reste sont inchangÃƒÂ©s. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.31.1 : Correctif d\'affichage (Gestion Eau, sur tÃƒÂ©lÃƒÂ©phone) : sur les ÃƒÂ©crans du module Eau, la derniÃƒÂ¨re carte du bas d\'une page n\'est plus masquÃƒÂ©e par la barre de navigation du bas Ã¢â‚¬â€ un petit espace apparaÃƒÂ®t dÃƒÂ©sormais entre la carte et la barre, mÃƒÂªme quand les libellÃƒÂ©s des onglets passent sur deux lignes. Aucune autre fonction modifiÃƒÂ©e. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.31.0 : Tableau de bord Eau : chaque carte est maintenant cliquable Ã¢â‚¬â€ toucher le corps d\'une carte ouvre le dÃƒÂ©tail (Tendances, ou Suivi pour le NRW et le Dernier bilan), toucher son icÃƒÂ´ne ouvre directement la saisie correspondante (relevÃƒÂ© bassin ou relevÃƒÂ© compteur). Les sept cartes sont aussi rangÃƒÂ©es en deux colonnes : ÃƒÂ  gauche celles liÃƒÂ©es au bassin (Stock, EntrÃƒÂ©es, DÃƒÂ©bit), ÃƒÂ  droite celles liÃƒÂ©es aux compteurs (Conso du jour, NRW, Conso rÃƒÂ©seau, Autonomie). Les deux mini-graphiques et la carte Ã‚Â« Dernier bilan Ã‚Â» sont ÃƒÂ©galement cliquables. Rien d\'autre ne change : mÃƒÂªmes chiffres, mÃƒÂªmes couleurs, mÃƒÂªmes icÃƒÂ´nes. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.30.1 : Saisie du bassin (Gestion Eau) : vous pouvez maintenant choisir la date et l\'heure d\'un relevÃƒÂ© de niveau ou d\'une entrÃƒÂ©e d\'eau, pour enregistrer une mesure faite plus tÃƒÂ´t. Un nouveau champ Ã‚Â« Date et heure Ã‚Â» (facultatif) apparaÃƒÂ®t sous la note, dans les onglets Niveau et EntrÃƒÂ©e. Si vous le laissez vide, c\'est l\'instant prÃƒÂ©sent qui est utilisÃƒÂ© (comme avant) ; si vous le remplissez, le relevÃƒÂ© est enregistrÃƒÂ© ÃƒÂ  la date choisie et apparaÃƒÂ®t au bon endroit sur la courbe. Une date dans le futur est refusÃƒÂ©e. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.30.0 : SÃƒÂ©curitÃƒÂ© du module Gestion Eau (Phase 2 Ã¢â‚¬â€ verrouillage des accÃƒÂ¨s par rÃƒÂ´le). Jusqu\'ici, mÃƒÂªme si l\'application affichait ÃƒÂ  chacun ce qui le concernait, les donnÃƒÂ©es de l\'eau (compteurs, relevÃƒÂ©s, factures, niveau du bassin commun) restaient techniquement accessibles cÃƒÂ´tÃƒÂ© serveur. DÃƒÂ©sormais, le serveur lui-mÃƒÂªme filtre tout selon votre rÃƒÂ´le : un client ne voit QUE ses propres compteurs, relevÃƒÂ©s et factures Ã¢â‚¬â€ jamais ceux d\'un voisin, ni le bassin commun. Le releveur peut consulter les compteurs et le bassin et saisir des relevÃƒÂ©s, mais pas les factures ni la liste des clients. L\'administrateur garde l\'accÃƒÂ¨s complet. Cette protection s\'applique partout, y compris si quelqu\'un essayait d\'interroger directement le serveur sans passer par l\'application. Le rattachement d\'un client par code et les demandes d\'accÃƒÂ¨s passent maintenant par une voie sÃƒÂ©curisÃƒÂ©e cÃƒÂ´tÃƒÂ© serveur. Aucune fonction visible n\'est retirÃƒÂ©e ; votre connexion (une seule fois) et le fonctionnement hors-ligne restent identiques. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.29.1 Ã¢â‚¬â€ Correctif : ouvrir ou rafraÃƒÂ®chir directement l\'adresse du module Eau (/gestion-eau) ne vous renvoie plus par erreur au tableau de bord. Le problÃƒÂ¨me survenait au tout premier affichage sur un appareil (cache vide) : le module n\'avait pas encore eu le temps de rÃƒÂ©cupÃƒÂ©rer votre rÃƒÂ´le (admin/releveur) auprÃƒÂ¨s du serveur et concluait ÃƒÂ  tort Ã‚Â« pas d\'accÃƒÂ¨s Ã‚Â». DÃƒÂ©sormais, tant que vos droits ne sont pas confirmÃƒÂ©s (connexion lente), l\'app patiente proprement (et rÃƒÂ©essaie automatiquement) au lieu de vous ÃƒÂ©jecter ; en cas d\'ÃƒÂ©chec durable, un ÃƒÂ©cran clair Ã‚Â« VÃƒÂ©rification de votre accÃƒÂ¨sÃ¢â‚¬Â¦ Ã‚Â» avec un bouton Ã‚Â« RÃƒÂ©essayer Ã‚Â» s\'affiche. Le renvoi vers l\'accueil ne se produit plus QUE si le serveur a bien rÃƒÂ©pondu et que vous n\'avez rÃƒÂ©ellement aucun rÃƒÂ´le eau. Aucune autre fonction modifiÃƒÂ©e. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.29.0 : SÃƒÂ©curitÃƒÂ© du module Gestion Eau (Phase 1 Ã¢â‚¬â€ fondation identitÃƒÂ©). Ãƒâ‚¬ l\'ouverture de l\'espace eau, l\'application vÃƒÂ©rifie dÃƒÂ©sormais que vous ÃƒÂªtes bien connectÃƒÂ© avec VOTRE compte (la mÃƒÂªme session sÃƒÂ©curisÃƒÂ©e que le reste de BazarKELY) avant d\'afficher quoi que ce soit. ConcrÃƒÂ¨tement : plus d\'ÃƒÂ©jection involontaire vers l\'accueil quand la connexion est lente (le module attend proprement votre session au lieu d\'abandonner), et si aucune session n\'est valide, un ÃƒÂ©cran clair Ã‚Â« Se reconnecter avec Google Ã‚Â» s\'affiche. Votre connexion reste mÃƒÂ©morisÃƒÂ©e : une seule connexion suffit, la session est conservÃƒÂ©e entre les fermetures de l\'app et les changements de page. CÃƒÂ´tÃƒÂ© administrateur, la dÃƒÂ©signation du tout premier propriÃƒÂ©taire de l\'espace eau se fait maintenant de faÃƒÂ§on fiable cÃƒÂ´tÃƒÂ© serveur. Aucune autre fonction modifiÃƒÂ©e ; les rÃƒÂ¨gles d\'accÃƒÂ¨s restent ouvertes pour l\'instant (le verrouillage par rÃƒÂ´le viendra en Phase 2). (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.28.0 : Logo du module AHUVI Eau affinÃƒÂ© : le logo de l\'en-tÃƒÂªte Gestion Eau utilise dÃƒÂ©sormais le visuel vectoriel officiel (carrÃƒÂ© sombre, jauge cyan, goutte d\'eau) Ã¢â‚¬â€ sans la lettre Ã‚Â« A Ã‚Â», avec un dÃƒÂ©gradÃƒÂ© de goutte ajustÃƒÂ©. Net ÃƒÂ  toute taille, sans requÃƒÂªte rÃƒÂ©seau. Les autres modules (BazarKELY, Construction) gardent leur logo Ã‚Â« B Ã‚Â» inchangÃƒÂ© et le clic sur le logo continue de basculer entre les modules. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.27.1 : Correctif menu Gestion Eau : le bouton Ã‚Â« Mise ÃƒÂ  jour Ã‚Â» du menu en haut ÃƒÂ  droite reste dÃƒÂ©sormais DANS le module Eau (la page version s\'ouvre sous /gestion-eau/version au lieu de la route globale /app-version) Ã¢â‚¬â€ fini la sensation d\'ÃƒÂªtre ÃƒÂ©jectÃƒÂ© vers BazarKELY (le header AHUVI et la barre du bas du module restent en place). (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.27.0 : Nouveau logo du module AHUVI Eau : dans l\'en-tÃƒÂªte de la Gestion Eau, l\'ancien carrÃƒÂ© gÃƒÂ©nÃƒÂ©rique Ã‚Â« B Ã‚Â» est remplacÃƒÂ© par le logo AHUVI Eau (carrÃƒÂ© sombre, jauge cyan, goutte d\'eau et lettre Ã‚Â« A Ã‚Â»). Les autres modules (BazarKELY, Construction) gardent leur logo Ã‚Â« B Ã‚Â» inchangÃƒÂ©. Le clic sur le logo continue de basculer entre les modules. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.26.1 : Correctif scan de ticket Ã¢â‚¬â€ Quand vous supprimez (ou Ã‚Â« restituez Ã‚Â») une dÃƒÂ©pense scannÃƒÂ©e, son ticket et ses lignes d\'article sont dÃƒÂ©sormais supprimÃƒÂ©s EN MÃƒÅ ME TEMPS, sur l\'appareil comme dans le cloud : plus de donnÃƒÂ©es orphelines qui traÃƒÂ®nent. Les anciennes donnÃƒÂ©es orphelines dÃƒÂ©jÃƒÂ  prÃƒÂ©sentes ont aussi ÃƒÂ©tÃƒÂ© nettoyÃƒÂ©es. Aucun changement visible sur la suppression des opÃƒÂ©rations normales ni des transferts. (DÃƒÂ©tail prÃƒÂ©cÃƒÂ©dent v3.26.0 : Le scan de ticket gagne un 2Ã¡Âµâ€° moteur, plus prÃƒÂ©cis, qui s\'active TOUT SEUL quand vous avez Internet : Google Cloud Vision (lecture cloud haute prÃƒÂ©cision). Hors-ligne, ou si le service en ligne tombe en panne / met trop de temps, l\'app bascule automatiquement sur la lecture locale gratuite Tesseract.js (Phase 1) Ã¢â‚¬â€ vous n\'ÃƒÂªtes jamais bloquÃƒÂ©. La clÃƒÂ© du service reste cachÃƒÂ©e cÃƒÂ´tÃƒÂ© serveur (Netlify Function), jamais dans l\'application. Comme le texte lu en ligne est plus propre, le ticket est insÃƒÂ©rÃƒÂ© directement plus souvent ; l\'ÃƒÂ©cran de relecture n\'apparaÃƒÂ®t qu\'en cas de doute (lecture incertaine ou total Ã¢â€°Â  somme des lignes). Le moteur rÃƒÂ©ellement utilisÃƒÂ© est tracÃƒÂ© sur chaque ticket. Tout le reste de la Phase 1 est inchangÃƒÂ© (crÃƒÂ©ation de la dÃƒÂ©pense = total, articles ÃƒÂ©ditables, aucune image stockÃƒÂ©e))))))))).)))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))';
export const LAST_UPDATED = '2026-06-17';
export const APP_BUILD_DATE = '2026-06-17';
export const VERSION_HISTORY = [
  {
    version: '3.66.4',
    date: '2026-06-20',
    description:
      'Gestion Eau — Tableau de bord : fond d’eau animé (SVG pur, AHUVI teal) dans la carte « Stock actuel », au niveau du % de remplissage. Strictement additif, aucune autre carte modifiée.',
    changes: [
      'Nouveau composant components/EauWaterFill.tsx : calque SVG décoratif (aria-hidden, pointer-events-none) ; niveau piloté exclusivement par le ratio, montée ease-out ~1,2 s sans dépassement + 2 vagues ondulantes (requestAnimationFrame, annulé au démontage) ; prefers-reduced-motion = niveau posé, statique.',
      'EauUi.tsx (PARTAGE) : prop optionnelle fillRatio sur EauStatCard — si fournie, rend EauWaterFill derriere le contenu (z-10) ; null/undefined = rendu strictement inchange (zero regression sur les autres cartes).',
      'EauDashboard.tsx : carte « Stock actuel » cablee fillRatio={data.tauxRemplissage}.',
      'constants/appVersion.ts + package.json : version 3.66.4 + note FR',
    ],
  },
  {
    version: '3.66.3',
    date: '2026-06-17',
    description:
      'SÃƒÂ©curitÃƒÂ© : fermeture de la faille Ã‚Â« auth_users_exposed Ã‚Â». Suppression complÃƒÂ¨te de lÃ¢â‚¬â„¢outil de nettoyage des comptes orphelins (vue + fonctions SECURITY DEFINER cÃƒÂ´tÃƒÂ© Supabase, service + panneau Admin cÃƒÂ´tÃƒÂ© front).',
    changes: [
      'Base Supabase : DROP de la vue orphaned_auth_users_monitor + des fonctions cleanup_orphaned_auth_users / test_cleanup_orphaned_auth_users / trigger_cleanup_orphaned_auth_users + trigger associÃƒÂ© (exposition email/tÃƒÂ©lÃƒÂ©phone ÃƒÂ  authenticated supprimÃƒÂ©e).',
      'Front : suppression de services/adminCleanupService.ts, des 3 fichiers test-cleanup-*.ts et de database/cleanup-orphaned-auth-users.sql ; retrait du panneau Ã‚Â« Nettoyage des Utilisateurs Orphelins Ã‚Â» dans pages/AdminPage.tsx (par soustraction).',
      'constants/appVersion.ts + package.json : version 3.66.3 + note FR',
    ],
  },
  {
    version: '3.66.0',
    date: '2026-06-17',
    description:
      'RelevÃƒÂ©s (Source) : bouton Ã¢â€œËœ Aide ajoutÃƒÂ© dans la barre dÃ¢â‚¬â„¢onglets collante (ÃƒÂ  droite de la nav, comme sur Compteurs) ; ouvre lÃ¢â‚¬â„¢aide Ã‚Â« Stock du bassin Ã‚Â» sous la barre. Aide de tÃƒÂªte retirÃƒÂ©e (plus de doublon).',
    changes: [
      'components/EauRelevesPage.tsx : Ã¢â€œËœ Aide Source cÃƒÂ¢blÃƒÂ© via rightSlot (useAideState(AIDE.bassinNiveau.id)) ; AidePanel rendu sous la barre au-dessus du contenu Source. Onglet Compteurs inchangÃƒÂ©.',
      'components/EauBassinReleves.tsx : retrait de lÃ¢â‚¬â„¢aide de tÃƒÂªte EauAide (dÃƒÂ©sormais portÃƒÂ©e par la barre) ; imports EauAide + AIDE supprimÃƒÂ©s (orphelins). Carte Stock = premier ÃƒÂ©lÃƒÂ©ment.',
      'constants/appVersion.ts + package.json : version 3.66.0 + note FR',
    ],
  },
  {
    version: '3.65.0',
    date: '2026-06-17',
    description:
      'RelevÃƒÂ©s (Compteurs) : bouton Ã¢â€œËœ Aide remontÃƒÂ© dans la barre dÃ¢â‚¬â„¢onglets collante (ÃƒÂ  droite de la nav, mÃƒÂªme ligne que les pilules) ; le panneau dÃ¢â‚¬â„¢aide reste dÃƒÂ©pliÃƒÂ© sous la barre.',
    changes: [
      'components/EauTabs.tsx [PARTAGÃƒâ€° module eau] : prop optionnelle rightSlot (emplacement ÃƒÂ  droite de la nav) ; conteneur interne en flex (nav flex-1 min-w-0 reste scrollable, rightSlot flex-shrink-0). Rendu identique pour les pages-thÃƒÂ¨me sans rightSlot.',
      'components/EauRelevesPage.tsx : Ã¢â€œËœ Aide cÃƒÂ¢blÃƒÂ© via rightSlot (onglet Compteurs uniquement, useAideState/AideToggleButton) ; panneau AidePanel rendu seul sous la barre. Onglet Source inchangÃƒÂ©.',
      'constants/appVersion.ts + package.json : version 3.65.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.64.0',
    date: '2026-06-17',
    description:
      "feat(eau) : onglets internes EauTabs en glassmorphisme (~50 % d'opacitÃƒÂ© + flou, le contenu dÃƒÂ©file visible/floutÃƒÂ© derriÃƒÂ¨re ; les pilules restent pleines/nettes). Calage des cartes corrigÃƒÂ© : ÃƒÂ  l'ouverture d'un tiroir, la carte se cale dÃƒÂ©sormais sous le BAS de la barre d'onglets collante (repÃƒÂ¨re data-eau-sticky-tabs) au lieu du bas du Header Ã¢â‚¬â€ sinon elle restait masquÃƒÂ©e derriÃƒÂ¨re les onglets (helper partagÃƒÂ© getEauCalageOffset, appliquÃƒÂ© ÃƒÂ  scrollUnderHeader + EauBassinReleves). Rebond ÃƒÂ©lastique iOS prononcÃƒÂ© en JavaScript (hook useEauRubberBand) : ÃƒÂ©tirement amorti ÃƒÂ  rÃƒÂ©sistance dÃƒÂ©gressive + retour ressort, sur appareil tactile, pages Eau uniquement ; translate le <main> (le Header, frÃƒÂ¨re, reste ÃƒÂ©pinglÃƒÂ© ; transform retirÃƒÂ© au repos Ã¢â€ â€™ sticky des onglets restaurÃƒÂ©).",
    changes: [
      'components/EauTabs.tsx [PARTAGÃƒâ€° module eau] : fond glassmorphisme bg-white/50 backdrop-blur-md + data-eau-sticky-tabs (repÃƒÂ¨re de calage) ; pilules inchangÃƒÂ©es',
      'utils/scrollUnderHeader.ts [PARTAGÃƒâ€° module eau] : nouveau getEauCalageOffset (bas de [data-eau-sticky-tabs] visible, sinon bas du Header) ; scrollElementUnderHeader vise ce bas',
      'components/EauBassinReleves.tsx : scrollReleveRowUnderHeader utilise getEauCalageOffset (calage sous les onglets)',
      'utils/useEauRubberBand.ts [NOUVEAU] : hook rubber-band tactile (touchstart/move/end, damp dÃƒÂ©gressif, retour ressort easeOutCubic, translate <main>, garde scrolls internes)',
      'components/Layout/AppLayout.tsx [PARTAGÃƒâ€°] : monte useEauRubberBand(isEauModule && isAuthenticated)',
      'constants/appVersion.ts + package.json : version 3.64.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.63.0',
    date: '2026-06-17',
    description:
      "feat(eau) : retouches UI de la page RelevÃƒÂ©s. Onglets internes EauTabs rendus collants (sticky) sous le Header partagÃƒÂ© (top = hauteur rÃƒÂ©elle du Header via ResizeObserver, z-40 < z-50, fond opaque + sÃƒÂ©parateur). Tiroir Ã‚Â« Saisir Ã‚Â» d'un relevÃƒÂ© de compteur : nouveau champ Date/heure optionnel (modÃƒÂ¨le EauApportsReleves, vide = maintenant, refus du futur, timestamp transmis ÃƒÂ  addReleveCompteur/addReleveElec) avec index + date sur une mÃƒÂªme ligne. Ãƒâ€°dition admin (tiroir Historique) : date + index cÃƒÂ´te ÃƒÂ  cÃƒÂ´te. Raccourcis du bas : icÃƒÂ´nes alignÃƒÂ©es sur les cartes de saisie Source (GlassWater / ArrowDownToLine). Bonus : rebond ÃƒÂ©lastique iOS relÃƒÂ¢chÃƒÂ© (overscroll-y-auto) uniquement sur le module Eau.",
    changes: [
      'components/EauTabs.tsx [PARTAGÃƒâ€°] : conteneur sticky z-40, top = hauteur Header (ResizeObserver), fond opaque + border-b',
      'components/Layout/AppLayout.tsx [PARTAGÃƒâ€°] : overscroll-y-auto sur /gestion-eau (ÃƒÂ©lastique), overscroll-none ailleurs (CÃ…â€œur/Construction inchangÃƒÂ©s)',
      'components/EauTiroirSaisie.tsx : champ Date/heure optionnel + validation futur + timestamp au payload + index/date sur une ligne',
      'components/EauCompteursReleves.tsx : ÃƒÂ©dition Historique admin = date + index sur une mÃƒÂªme ligne',
      'components/EauRelevesPage.tsx : raccourcis #2/#3 icÃƒÂ´nes GlassWater / ArrowDownToLine',
      'constants/appVersion.ts + package.json : version 3.63.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.62.0',
    date: '2026-06-16',
    description:
      "refactor(eau) : rÃƒÂ©organisation interne des deux derniers ÃƒÂ©crans monolithiques du module Eau, SANS aucun changement d'usage ni d'apparence. `EauBassinReleves` (onglet Source/Bassin) est dÃƒÂ©coupÃƒÂ© en un hook de donnÃƒÂ©es/actions `useBassinReleves` + sous-composants `bassin/*` (carte Stock, saisie hauteur, tests de dÃƒÂ©bit, arrÃƒÂªts de pompe, historique admin) ; `EauDemandesPage` (Invitations & demandes) est dÃƒÂ©coupÃƒÂ© en `demandes/*` (formulaire d'invitation, import du rÃƒÂ©pertoire, liste des demandes). Les champs de saisie vivent dÃƒÂ©sormais dans les sous-composants Ã¢â€ â€™ la frappe ne re-render plus les listes. Helpers purs factorisÃƒÂ©s (`utils/dateInput`, `utils/duree`) et conteneur d'accordÃƒÂ©on partagÃƒÂ© (`components/EauDrawer`, mutualisÃƒÂ© avec EauApportsReleves). Aucun calcul de bilan dÃƒÂ©placÃƒÂ©. tsc --noEmit OK, build OK, 169 tests verts.",
    changes: [
      'components/EauBassinReleves.tsx : 1256 Ã¢â€ â€™ 235 lignes ; orchestration seule (refs, scroll sous Header, deep-link, agencement, explain)',
      'components/bassin/useBassinReleves.ts [NOUVEAU] : ÃƒÂ©tats donnÃƒÂ©es + tiroirs + handlers (submit/edit/remove/recompute)',
      'components/bassin/{BassinStockCard,BassinSaisie,TestsDebit,ArretsPompe,BassinHistoriqueAdmin}.tsx [NOUVEAUX]',
      'components/EauDemandesPage.tsx : 956 Ã¢â€ â€™ 394 lignes ; listes invitations + liens + rÃƒÂ©vocation conservÃƒÂ©s',
      'components/demandes/{InvitationForm,BatchImportPanel,DemandesList}.tsx [NOUVEAUX] : ÃƒÂ©tat de saisie isolÃƒÂ©',
      'utils/dateInput.ts + utils/duree.ts [NOUVEAUX] : helpers purs factorisÃƒÂ©s (+ tests __tests__/eauDateDuree.test.ts)',
      'components/EauDrawer.tsx [NOUVEAU] : accordÃƒÂ©on partagÃƒÂ© ; EauApportsReleves.tsx mis ÃƒÂ  jour pour le rÃƒÂ©utiliser',
      'constants/appVersion.ts + package.json : version 3.62.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.60.2',
    date: '2026-06-15',
    description:
      "fix(eau) : dÃƒÂ©blocage du build de production. `utils/format.ts` (`fmtM3h`, `fmtKw`) et `services/eauElecReleveService.ts` (`ElecKpiData.consoRecenteKw` + calcul kW = kWh/durÃƒÂ©e) ÃƒÂ©taient ÃƒÂ©crits mais JAMAIS commitÃƒÂ©s, alors que `EauDashboard.tsx` (commitÃƒÂ©) les importe/utilise Ã¢â€ â€™ build Rollup en ÃƒÂ©chec (`fmtM3h is not exported`) Ã¢â€ â€™ AUCUN dÃƒÂ©ploiement Cloudflare depuis plusieurs versions (prod figÃƒÂ©e sur une version antÃƒÂ©rieure, alors que le local tournait via le working tree). Commit de ces helpers + correctif du test `eauNavRoles.test.tsx` (ordre nav Compteurs avant Suivi, alignÃƒÂ© sur constants/index.ts). Additif. tsc OK, build OK (70 tests verts).",
    changes: [
      'utils/format.ts : + fmtM3h, fmtKw (ÃƒÂ©taient non commitÃƒÂ©s)',
      'services/eauElecReleveService.ts : + ElecKpiData.consoRecenteKw + calcul kW (ÃƒÂ©tait non commitÃƒÂ©)',
      '__tests__/eauNavRoles.test.tsx : ordre nav attendu Compteurs avant Suivi',
      'constants/appVersion.ts + package.json : version 3.60.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.60.1',
    date: '2026-06-15',
    description:
      "style : barre d'ÃƒÂ©tat systÃƒÂ¨me (status bar mobile) synchronisÃƒÂ©e avec le header du module. `Header.tsx` : useEffect qui met `meta[name=theme-color]` ÃƒÂ  `#364E30` (ahuvi-forest, teinte dominante du header eau `from-ahuvi-forest/95 to-ahuvi-olive/90 backdrop-blur-md`) quand `isEauModule`, sinon `#3b0764` (violet BazarKELY, dÃƒÂ©faut index.html). La meta theme-color ÃƒÂ©tant SOLIDE cÃƒÂ´tÃƒÂ© OS, l'effet translucide/blur du header ne peut pas y ÃƒÂªtre reproduit (documentÃƒÂ©). Construction/BazarKELY inchangÃƒÂ©s (violet). tsc OK, build OK.",
    changes: [
      'components/Layout/Header.tsx (PARTAGÃƒâ€°) : theme-color dynamique selon le module (eau = vert AHUVI, sinon violet)',
      'constants/appVersion.ts + package.json : version 3.60.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.60.0',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord Ã¢â‚¬â€ le sÃƒÂ©lecteur de pÃƒÂ©riode (`<select>` natif, non animable) est remplacÃƒÂ© par un menu dÃƒÂ©roulant custom chartÃƒÂ© AHUVI + animation faÃƒÂ§on iOS. Bouton (CalendarRange + libellÃƒÂ© courant) Ã¢â€ â€™ panneau `role=listbox` absolu (rounded-xl, shadow-lg, option active bg-ahuvi-50 + Check). Toujours montÃƒÂ©, ouverture/fermeture par classes : `opacity/scale-95/-translate-y-1` Ã¢â€ â€™ `opacity-100/scale-100/translate-y-0`, `transition-[opacity,transform] duration-200`, timing `cubic-bezier(0.16,1,0.3,1)` (ease-out-expo, sans rebond), `origin-top-right`, `motion-reduce:transition-none`. Fermeture au pointerdown extÃƒÂ©rieur + Ãƒâ€°chap (useEffect, listeners conditionnels). `useRef`+`Check` ajoutÃƒÂ©s. Comportement (changeBase, persistance localStorage) inchangÃƒÂ©. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : sÃƒÂ©lecteur de pÃƒÂ©riode = menu dÃƒÂ©roulant custom animÃƒÂ© (ease-out-expo, fermeture clic extÃƒÂ©rieur/Ãƒâ€°chap, a11y listbox)',
      'constants/appVersion.ts + package.json : version 3.60.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.59.9',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord Ã¢â‚¬â€ icÃƒÂ´ne de la carte Ã‚Â« Stock actuel Ã‚Â» : `Droplet` Ã¢â€ â€™ `GlassWater` (contenant avec niveau d'eau, parlant pour le % de remplissage et lÃƒÂ¨ve le doublon de gouttes). Ã‚Â« Conso au compteur Ã‚Â» conserve `Droplet` (toujours utilisÃƒÂ©, + graphes). Import lucide + GlassWater. PrÃƒÂ©sentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : icÃƒÂ´ne carte Ã‚Â« Stock actuel Ã‚Â» Droplet Ã¢â€ â€™ GlassWater',
      'constants/appVersion.ts + package.json : version 3.59.9 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.8',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord Ã¢â‚¬â€ icÃƒÂ´ne de la carte Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â» : `Percent` (hÃƒÂ©ritÃƒÂ© du NRW, plus pertinent depuis le passage en mÃ‚Â³/h) Ã¢â€ â€™ `SearchX` (loupe barrÃƒÂ©e = eau qui ÃƒÂ©chappe au comptage). Ãƒâ€°vite le doublon avec les gouttes (Droplet Ãƒâ€”2) et n'est pas alarmiste. Import lucide PercentÃ¢â€ â€™SearchX. PrÃƒÂ©sentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : icÃƒÂ´ne carte Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â» Percent Ã¢â€ â€™ SearchX',
      'constants/appVersion.ts + package.json : version 3.59.8 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.7',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord Ã¢â‚¬â€ carte Ã‚Â« Conso au compteur Ã‚Â» : ajout ÃƒÂ  droite de la valeur de sa part de la conso du rÃƒÂ©seau (`consoCompteurPct = flux.consoM3 / flux.consoReseauM3 Ãƒâ€” 100`), en gris, mÃƒÂªme rendu que le % de Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â» (value en flex justify-between). Les deux parts (comptÃƒÂ©e + non comptÃƒÂ©e) totalisent ~100 %. PrÃƒÂ©sentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : + consoCompteurPct ; carte Ã‚Â« Conso au compteur Ã‚Â» affiche sa part de la conso du rÃƒÂ©seau ÃƒÂ  droite de la valeur',
      'constants/appVersion.ts + package.json : version 3.59.7 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.6',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord Ã¢â‚¬â€ carte Ã‚Â« Autonomie estimÃƒÂ©e Ã‚Â» : ajout, ÃƒÂ  droite du hint, de l'ÃƒÂ©quivalent horaire de la conso moyenne (`fmtM3h(autonomie.consoMoyenneHeureM3)`) en gris ; hint rendu en `flex justify-between items-baseline` (mÃ‚Â³/j ÃƒÂ  gauche, mÃ‚Â³/h ÃƒÂ  droite). PrÃƒÂ©sentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : carte Autonomie Ã¢â‚¬â€ hint mÃ‚Â³/j + ÃƒÂ©quivalent mÃ‚Â³/h ÃƒÂ  droite',
      'constants/appVersion.ts + package.json : version 3.59.6 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.5',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord Ã¢â‚¬â€ carte Ã‚Â« Conso au compteur Ã‚Â» rÃƒÂ©duite ÃƒÂ  UNE ligne de hint (`cumulSub(flux.consoM3)`). Retrait de la 2Ã¡Âµâ€° ligne `consoJourHint` (origine du chiffre, Ã‚Â« estimÃƒÂ©e/mesurÃƒÂ©e Ã‚Â»), de la fonction `consoJourHint` devenue inutilisÃƒÂ©e et de l'import de type `ConsoJourSource` (noUnusedLocals). `TrendingUp` reste utilisÃƒÂ© (liens Tendances). PrÃƒÂ©sentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : hint Ã‚Â« Conso au compteur Ã‚Â» sur une seule ligne ; suppression de consoJourHint + import ConsoJourSource',
      'constants/appVersion.ts + package.json : version 3.59.5 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.4',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord Ã¢â‚¬â€ le % d'eau non comptÃƒÂ©e (`eauNonCompteePct`) repasse sur la carte Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â», ÃƒÂ  droite de SA valeur (value en `flex justify-between items-baseline`, % en gris text-sm). La carte Ã‚Â« Conso au compteur Ã‚Â» retrouve sa valeur simple (`fmtM3h(rate(flux.consoM3))`, sans le %). PrÃƒÂ©sentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : % dÃƒÂ©placÃƒÂ© sur la valeur de Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â» (flex ÃƒÂ  droite) ; Ã‚Â« Conso au compteur Ã‚Â» remis en valeur simple',
      'constants/appVersion.ts + package.json : version 3.59.4 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.3',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord Ã¢â‚¬â€ le % d'eau non comptÃƒÂ©e (`eauNonCompteePct`) est dÃƒÂ©placÃƒÂ© de la carte Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â» vers la carte Ã‚Â« Conso au compteur Ã‚Â» : affichÃƒÂ© en gris (text-sm, text-gray-400) ÃƒÂ  droite de la valeur (value rendu en `flex justify-between items-baseline`, % avec title explicatif). La ligne grise Ã‚Â« Y % de la conso du rÃƒÂ©seau Ã‚Â» est retirÃƒÂ©e du hint de Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â» (ne reste que Ã‚Â« X mÃ‚Â³ hors compteur Ã‚Â»). MÃƒÂªmes garde-fous (affichÃƒÂ© seulement si eau non comptÃƒÂ©e Ã¢â€°Â¥ 0 et pct dÃƒÂ©fini). PrÃƒÂ©sentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : % eau non comptÃƒÂ©e dÃƒÂ©placÃƒÂ© ÃƒÂ  droite de la valeur Ã‚Â« Conso au compteur Ã‚Â» ; retrait de la ligne % du hint Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â»',
      'constants/appVersion.ts + package.json : version 3.59.3 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.2',
    date: '2026-06-15',
    description:
      "style(eau) : tableau de bord Ã¢â‚¬â€ carte Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â» homogÃƒÂ©nÃƒÂ©isÃƒÂ©e avec les autres KPI. Valeur = DÃƒâ€°BIT mÃ‚Â³/h (`fmtM3h(rate(eauNonCompteeM3))`) au lieu du %. `eauNonCompteeM3 = flux[base].consoReseauM3 Ã¢Ë†â€™ flux[base].consoM3` (mÃƒÂªmes fenÃƒÂªtres que Conso du rÃƒÂ©seau/au compteur Ã¢â€ â€™ suit le sÃƒÂ©lecteur de pÃƒÂ©riode) ; `eauNonCompteePct = eauNonCompteeM3 / flux.consoReseauM3 Ãƒâ€” 100`. Hint = Ã‚Â« X mÃ‚Â³ hors compteur Ã‚Â» + ligne grise Ã‚Â« Y % de la conso du rÃƒÂ©seau Ã‚Â». Garde-fous conservÃƒÂ©s : dÃƒÂ©bit inconnu (`flux.consoReseauM3 == null`) Ã¢â€ â€™ Ã‚Â« Ã¢â‚¬â€ Ã‚Â» + Ã‚Â« DÃƒÂ©bit des pompes requis Ã‚Â» ; eau non comptÃƒÂ©e nÃƒÂ©gative Ã¢â€ â€™ Ã‚Â« Ã¢â‚¬â€ Ã‚Â» + Ã‚Â« Sortie sous le compteur Ã¢â‚¬â€ vÃƒÂ©rifier le dÃƒÂ©bit Ã‚Â». Plus de dÃƒÂ©pendance ÃƒÂ  `nrwReseauPeriode` pour cette carte. PrÃƒÂ©sentationnel. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : carte Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â» en mÃ‚Â³/h (fenÃƒÂªtre courante) + % gris vs conso rÃƒÂ©seau + hint Ã‚Â« hors compteur Ã‚Â» + garde-fous',
      'constants/appVersion.ts + package.json : version 3.59.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.1',
    date: '2026-06-15',
    description:
      "style(eau) : Conso du rÃƒÂ©seau / NRW Ã¢â‚¬â€ Phase 3 (tableau de bord). Carte Ã‚Â« NRW (pÃƒÂ©riode) Ã‚Â» Ã¢â€ â€™ Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â» : value = `nrwReseauPeriode.nrwPct` en % (inchangÃƒÂ©), hint = Ã‚Â« X mÃ‚Â³ non comptÃƒÂ©s sur la pÃƒÂ©riode Ã‚Â» (au lieu de Ã‚Â« Pertes : X Ã‚Â»), tone `rose`Ã¢â€ â€™`amber` (ÃƒÂ  surveiller Ã¢â€°Â  perte). Garde-fous : si `nrwReseauPeriode` null (dÃƒÂ©bit inconnu) Ã¢â€ â€™ Ã‚Â« Ã¢â‚¬â€ Ã‚Â» + Ã‚Â« DÃƒÂ©bit des pompes requis Ã‚Â» ; si `nrwPct < 0` (sortie sous le compteur) Ã¢â€ â€™ Ã‚Â« Ã¢â‚¬â€ Ã‚Â» + Ã‚Â« Sortie sous le compteur Ã¢â‚¬â€ vÃƒÂ©rifier le dÃƒÂ©bit Ã‚Â». Suppression du repli sur l'ancien NRW entrÃƒÂ©es (`nrwPeriode`) pour cette carte. La carte Ã‚Â« Conso du rÃƒÂ©seau Ã‚Â» garde dÃƒÂ©jÃƒÂ  son garde-fou Ã‚Â« Ã¢â‚¬â€ Ã‚Â». PrÃƒÂ©sentationnel uniquement (calcul Phase 2 inchangÃƒÂ©). Anomalie Ã‚Â« eau non comptÃƒÂ©e Ã‚Â» dÃƒÂ©jÃƒÂ  neutralisÃƒÂ©e en Phase 2. tsc OK, build OK.",
    changes: [
      'components/EauDashboard.tsx : carte Ã‚Â« NRW (pÃƒÂ©riode) Ã‚Â» Ã¢â€ â€™ Ã‚Â« Eau non comptÃƒÂ©e Ã‚Â» (libellÃƒÂ©, hint Ã‚Â« non comptÃƒÂ©s Ã‚Â», tone amber, garde-fous null/nÃƒÂ©gatif, retrait repli nrwPeriode)',
      'constants/appVersion.ts + package.json : version 3.59.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.59.0',
    date: '2026-06-15',
    description:
      "feat(eau) : Conso du rÃƒÂ©seau / NRW Ã¢â‚¬â€ Phase 2 (moteur Ã‚Â« dÃƒÂ©bit Ãƒâ€” temps de marche Ã‚Â»). `utils/bilan.ts` : la sortie rÃƒÂ©seau est DÃƒâ€°COUPLÃƒâ€°E du bilan de matiÃƒÂ¨re. Nouveau : `heuresArretSurIntervalle` (ÃŽÂ£ recouvrements des arrÃƒÂªts de pompe avec ]tPrev,t]) + input `arrets` + `ArretPompeLite`. `consoReseauM3 = apportReseau Ã¢Ë†â€™ ÃŽâ€stock` oÃƒÂ¹ apportReseau = override > entrÃƒÂ©es > `dÃƒÂ©bit Ãƒâ€” (ÃŽâ€t Ã¢Ë†â€™ arrÃƒÂªts)` (PLUS de plafond flotteur, PLUS de FRACTION_POMPE) ; `null` si dÃƒÂ©bit inconnu ou sortie Ã¢â€°Â¤ 0. `pertesM3`/`nrwReseauPct` Ã¢â€ â€™ nullable (= eau non comptÃƒÂ©e). `apportM3`/stockAttendu/ÃƒÂ©cart/anomalie de STOCK inchangÃƒÂ©s (bilan de matiÃƒÂ¨re conservÃƒÂ©). `eauBilanService` : charge `eau_arrets_pompe` + passe `arrets` ; l'anomalie stockÃƒÂ©e ne folde PLUS `anomalieReseau` (eau non comptÃƒÂ©e = normale). Dashboard inchangÃƒÂ© d'aspect (carte NRW renommÃƒÂ©e en Phase 3). Recalcul requis : Ã‚Â« Recalculer tous les bilans Ã‚Â». Tests : 70 OK (eauBassinDebit mis ÃƒÂ  jour au nouveau modÃƒÂ¨le + 3 nouveaux : arrÃƒÂªts dÃƒÂ©duits, arrÃƒÂªt total Ã¢â€ â€™ null, sans dÃƒÂ©bit Ã¢â€ â€™ null). tsc OK, build OK.",
    changes: [
      'utils/bilan.ts : + heuresArretSurIntervalle/ArretPompeLite + input arrets ; consoReseau = dÃƒÂ©bit Ãƒâ€” temps de marche Ã¢Ë†â€™ ÃŽâ€stock (nullable) ; pertes/nrw nullable ; apport mass-balance + ÃƒÂ©cart/anomalie inchangÃƒÂ©s',
      'services/eauBilanService.ts : charge eau_arrets_pompe + passe arrets ; anomalie = ÃƒÂ©cart de stock seul (plus anomalieReseau)',
      '__tests__/eauBassinDebit.test.ts : assertions conso rÃƒÂ©seau alignÃƒÂ©es sur le nouveau modÃƒÂ¨le + 3 tests (arrÃƒÂªts, arrÃƒÂªt total, sans dÃƒÂ©bit)',
      'constants/appVersion.ts + package.json : version 3.59.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.58.0',
    date: '2026-06-15',
    description:
      "feat(eau) : ArrÃƒÂªts de pompe Ã¢â‚¬â€ Phase 1 (saisie + stockage synchronisÃƒÂ©, PAS encore branchÃƒÂ©e au calcul). Nouvelle entitÃƒÂ© `eau_arrets_pompe` (Dexie v7 + table Supabase + RLS calquÃƒÂ©e sur eau_debit_tests : SELECT admin/releveur + promoteur, INSERT/UPDATE admin/releveur, DELETE admin ; table crÃƒÂ©ÃƒÂ©e et vÃƒÂ©rifiÃƒÂ©e via REST avant dÃƒÂ©ploiement Ã¢â€ â€™ pas de drift schÃƒÂ©ma). ModÃƒÂ¨le `ArretPompeRow/Local` (id, timestamp_debut, timestamp_fin, duree_min, agent_id, note, created_at) ; forme canonique (dÃƒÂ©but, fin), `duree_min` recalculÃƒÂ©e. Service offline-first `addArretPompe/listArretsPompe/deleteArretPompe/refreshArretsPompe` (saveLocal + upsert idempotent id client, getCurrentUserIdSync). Sync : ajout ÃƒÂ  EAU_TABLES + PK_BY_TABLE. UI : section dÃƒÂ©pliable Ã‚Â« ArrÃƒÂªts de pompe Ã‚Â» sous l'onglet Source (EauBassinReleves), 2 modes de saisie (DÃƒÂ©but/fin OU DÃƒÂ©but+durÃƒÂ©e min), aperÃƒÂ§u de durÃƒÂ©e, liste + suppression (admin/releveur), lecture seule pour promoteur. Aucun impact sur les bilans/tableau de bord (Phase 2 : temps de marche = temps ÃƒÂ©coulÃƒÂ© Ã¢Ë†â€™ ÃŽÂ£ arrÃƒÂªts). tsc --noEmit OK, build OK.",
    changes: [
      'types/gestionEau.ts : + ArretPompeRow/ArretPompeLocal',
      'db/gestionEauDb.ts : + table eau_arrets_pompe (version 7) + EAU_TABLES',
      "services/eauSync.ts : + eau_arrets_pompe dans PK_BY_TABLE",
      'services/eauBassinService.ts : + addArretPompe/listArretsPompe/deleteArretPompe/refreshArretsPompe',
      'components/EauBassinReleves.tsx : + section Ã‚Â« ArrÃƒÂªts de pompe Ã‚Â» (2 modes de saisie, liste, suppression)',
      'Supabase : create table eau_arrets_pompe + index + RLS (exÃƒÂ©cutÃƒÂ© via ÃƒÂ©diteur SQL, vÃƒÂ©rifiÃƒÂ© REST)',
      'constants/appVersion.ts + package.json : version 3.58.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.57.7',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord Ã¢â‚¬â€ carte Ã‚Â« Pompes en marche Ã‚Â» : le sous-texte Ã‚Â« Apport des pompes Ã‚Â» devient Ã‚Â« DÃƒÂ©bit entrant Ã‚Â». PrÃƒÂ©sentationnel uniquement (prop `hint`), valeur inchangÃƒÂ©e. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauDashboard.tsx : hint Ã‚Â« Apport des pompes Ã‚Â» Ã¢â€ â€™ Ã‚Â« DÃƒÂ©bit entrant Ã‚Â»",
      'constants/appVersion.ts + package.json : version 3.57.7 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.6',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord Ã¢â‚¬â€ carte de dÃƒÂ©bit des pompes : titre raccourci de Ã‚Â« DÃƒÂ©bit pompes en marche Ã‚Â» ÃƒÂ  Ã‚Â« Pompes en marche Ã‚Â» (le mot Ã‚Â« DÃƒÂ©bit Ã‚Â» retirÃƒÂ© pour ÃƒÂ©viter une ligne trop longue). PrÃƒÂ©sentationnel uniquement, valeur inchangÃƒÂ©e. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauDashboard.tsx : label Ã‚Â« DÃƒÂ©bit pompes en marche Ã‚Â» Ã¢â€ â€™ Ã‚Â« Pompes en marche Ã‚Â»",
      'constants/appVersion.ts + package.json : version 3.57.6 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.5',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord Ã¢â‚¬â€ carte Ã‚Â« DÃƒÂ©bit source Ã‚Â» renommÃƒÂ©e Ã‚Â« DÃƒÂ©bit pompes en marche Ã‚Â» (prÃƒÂ©sentationnel uniquement). Modification du seul prop `label` de la carte (valeur `debitCourantM3h` inchangÃƒÂ©e). Aucun changement de calcul/donnÃƒÂ©e/logique. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauDashboard.tsx : label Ã‚Â« DÃƒÂ©bit source Ã‚Â» Ã¢â€ â€™ Ã‚Â« DÃƒÂ©bit pompes en marche Ã‚Â»",
      'constants/appVersion.ts + package.json : version 3.57.5 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.4',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord Ã¢â‚¬â€ renommage de deux cartes KPI pour clarifier eau facturable vs eau sortie du bassin (prÃƒÂ©sentationnel uniquement). `label={`Conso ${winSuffix}`}` Ã¢â€ â€™ Ã‚Â« Conso au compteur Ã‚Â» (conso mÃƒÂ©trÃƒÂ©e aux compteurs = facturable) ; `label={`Conso rÃƒÂ©seau ${winSuffix}`}` Ã¢â€ â€™ Ã‚Â« Conso du rÃƒÂ©seau Ã‚Â» (sortie brute du bassin = apport Ã¢Ë†â€™ ÃŽâ€stock = conso + pertes). La carte NRW reste la diffÃƒÂ©rence (pertes). Suffixe de fenÃƒÂªtre retirÃƒÂ© du titre (la pÃƒÂ©riode figure dÃƒÂ©jÃƒÂ  dans le hint via winSub). Aucun changement de valeur/calcul/logique. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauDashboard.tsx : labels Ã‚Â« Conso au compteur Ã‚Â» + Ã‚Â« Conso du rÃƒÂ©seau Ã‚Â» (suffixe fenÃƒÂªtre retirÃƒÂ© de ces 2 titres)",
      'constants/appVersion.ts + package.json : version 3.57.4 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.3',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord Ã¢â‚¬â€ sous-titre d'en-tÃƒÂªte raccourci en Ã‚Â« Tableau de bord Ã‚Â» (au lieu de Ã‚Â« Tableau de bord du bassin et des compteurs Ã‚Â») pour ÃƒÂ©viter un retour ÃƒÂ  la ligne sur 2 lignes. Modification du seul prop `subtitle` passÃƒÂ© ÃƒÂ  EauPageShell depuis EauDashboard (le shell partagÃƒÂ© n'est pas touchÃƒÂ©). Le sous-titre reste cliquable (ouverture de l'aide). Aucun changement de calcul/donnÃƒÂ©e/navigation. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauDashboard.tsx : prop subtitle Ã‚Â« Tableau de bord du bassin et des compteurs Ã‚Â» Ã¢â€ â€™ Ã‚Â« Tableau de bord Ã‚Â»",
      'constants/appVersion.ts + package.json : version 3.57.3 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.2',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord Ã¢â‚¬â€ retouche du sÃƒÂ©lecteur de pÃƒÂ©riode (prÃƒÂ©sentationnel uniquement). (1) Suppression de la bordure propre du `<select>` (border-0) Ã¢â‚¬â€ c'est la bordure que `@tailwindcss/forms` applique au select lui-mÃƒÂªme, visible ÃƒÂ  l'intÃƒÂ©rieur du cadre `<label>` ; seul le cadre du label subsiste. (2) Retrait de l'icÃƒÂ´ne `ChevronDown` (le Ã‚Â« V Ã‚Â» ÃƒÂ  droite du libellÃƒÂ©) ajoutÃƒÂ©e en v3.57.1, ainsi que son import lucide. Comportement (options, onChange, persistance localStorage, recalcul KPI) inchangÃƒÂ©. tsc --noEmit OK, build OK.",
    changes: [
      'modules/gestion-eau/components/EauDashboard.tsx : select border-0 (bordure forms-plugin retirÃƒÂ©e) ; ChevronDown supprimÃƒÂ© (ÃƒÂ©lÃƒÂ©ment + import lucide)',
      'constants/appVersion.ts + package.json : version 3.57.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.1',
    date: '2026-06-15',
    description:
      "style(eau) : Tableau de bord Ã¢â‚¬â€ finitions du sÃƒÂ©lecteur de pÃƒÂ©riode + ordre de deux cartes KPI (prÃƒÂ©sentationnel uniquement). (A) baseSelector entiÃƒÂ¨rement chartÃƒÂ© AHUVI : icÃƒÂ´ne lucide CalendarRange (ahuvi-forest) Ã‚Â« icÃƒÂ´ne d'abord Ã‚Â» + ChevronDown (ahuvi-olive, pointer-events-none) ÃƒÂ  droite ; select en appearance-none/focus:ring-0 (suppression de l'anneau bleu @tailwindcss/forms et de la flÃƒÂ¨che native) ; font-ahuvi-body, shadow-soft, hover:border-ahuvi-300, focus-within:ring-ahuvi-300 ; plus aucune teinte bleue/grise. Comportement (options, onChange, persistance localStorage) inchangÃƒÂ©. (B) Colonne gauche rÃƒÂ©ordonnÃƒÂ©e dans le JSX : STOCK ACTUEL Ã¢â€ â€™ DÃƒâ€°BIT SOURCE Ã¢â€ â€™ ENTRÃƒâ€°ES (DÃƒÂ©bit source remontÃƒÂ© au-dessus d'EntrÃƒÂ©es). (C) Colonne droite rÃƒÂ©ordonnÃƒÂ©e dans le JSX : CONSO RÃƒâ€°SEAU Ã¢â€ â€™ CONSO Ã¢â€ â€™ NRW Ã¢â€ â€™ AUTONOMIE ESTIMÃƒâ€°E (Conso rÃƒÂ©seau remontÃƒÂ©e en tÃƒÂªte). RÃƒÂ©ordonnancement par dÃƒÂ©placement de blocs JSX (aucun order-* CSS), aucune carte dupliquÃƒÂ©e/perdue, aucun changement de calcul/donnÃƒÂ©e/navigation/offline. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauDashboard.tsx : sÃƒÂ©lecteur de pÃƒÂ©riode chartÃƒÂ© AHUVI (CalendarRange + ChevronDown, appearance-none, focus:ring-0) ; colonne gauche STOCKÃ¢â€ â€™DÃƒâ€°BITÃ¢â€ â€™ENTRÃƒâ€°ES ; colonne droite CONSO RÃƒâ€°SEAUÃ¢â€ â€™CONSOÃ¢â€ â€™NRWÃ¢â€ â€™AUTONOMIE ; import lucide ClockÃ¢â€ â€™CalendarRange+ChevronDown",
      'constants/appVersion.ts + package.json : version 3.57.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.57.0',
    date: '2026-06-15',
    description:
      "style(eau) : onglet Ã‚Â« Source Ã‚Â» Ã¢â‚¬â€ fusion de la carte Ã‚Â« Bassin Ã‚Â» dans la carte Ã‚Â« Stock d'eau du bassin Ã‚Â» (prÃƒÂ©sentationnel uniquement). La carte Ã‚Â« Bassin Ã‚Â» est supprimÃƒÂ©e ; sa ligne de relevÃƒÂ© brut (hauteur/volume/date) et son crayon de saisie sont rapatriÃƒÂ©s dans la carte de tÃƒÂªte Ã‚Â« Stock d'eau du bassin Ã‚Â», sous la grille Attendu/Ãƒâ€°cart, dans une rangÃƒÂ©e `mt-3 pt-3 border-t` : ÃƒÂ  gauche une zone cliquable (icÃƒÂ´ne Ruler teal + ligne brute, `flex-1`) Ã¢â€ â€™ tiroir Historique, ÃƒÂ  droite le crayon (`disabled isReadOnly||!dim`) Ã¢â€ â€™ tiroir Saisie ; `stopPropagation` sur les deux pour ne pas dÃƒÂ©clencher Ã‚Â« Comprendre Ã‚Â». Les tiroirs `'saisir'` et `'histo'` cohabitent dÃƒÂ©sormais avec `explainOpen` dans la mÃƒÂªme carte. `ref={bassinCardRef}` dÃƒÂ©placÃƒÂ© sur la carte Stock (scroll sous Header ÃƒÂ  l'ouverture d'un tiroir + deep-link `bt=niveau` conservÃƒÂ©s). Aucun changement de calcul/service/RLS/offline. tsc --noEmit OK, build OK.",
    changes: [
      "modules/gestion-eau/components/EauBassinReleves.tsx : fusion carte Bassin Ã¢â€ â€™ carte Stock (rangÃƒÂ©e relevÃƒÂ© + crayon + tiroirs Saisir/Histo rapatriÃƒÂ©s, ref repositionnÃƒÂ©e, carte Bassin supprimÃƒÂ©e)",
      'constants/appVersion.ts + package.json : version 3.57.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.55.0',
    date: '2026-06-15',
    description:
      "feat(eau) : 6 retouches navigation + prÃƒÂ©sentation du thÃƒÂ¨me Compteurs (prÃƒÂ©sentationnel + navigation uniquement). (1) GESTION_EAU_NAV_ITEMS : Ã‚Â« Compteurs Ã‚Â» rÃƒÂ©ordonnÃƒÂ© AVANT Ã‚Â« Suivi Ã‚Â» (Tableau de bord Ã‚Â· RelevÃƒÂ©s Ã‚Â· Compteurs Ã‚Â· Suivi Ã‚Â· Facturation). (2) EauCompteursReleves : bouton icÃƒÂ´ne seule Ã‚Â« Nouveau compteur Ã‚Â» (lucide Network, style secondaire AHUVI border-ahuvi-200 Ã¢â‚¬â€ JAMAIS teal) ÃƒÂ  droite de Scan Ã¢â€ â€™ navigate('/gestion-eau/compteurs?new=1') via nouvelle prop additive onNewCompteur (callback depuis EauRelevesPage). (3) EauCompteursPage : ?new=1 ouvre le formulaire de crÃƒÂ©ation au montage puis nettoie le paramÃƒÂ¨tre (setParams({},{replace:true})). (4) Ouverture du formulaire de crÃƒÂ©ation Ã¢â€ â€™ la page glisse pour caler son bord haut sous le Header (scrollElementUnderHeader, rAFÃƒâ€”2). (5) Ã‚Â« Modifier Ã‚Â» d'une carte ouvre dÃƒÂ©sormais un tiroir d'ÃƒÂ©dition en accordÃƒÂ©on SOUS la carte (ÃƒÂ©tat unifiÃƒÂ© formMode {new|edit,id} ; un seul tiroir ÃƒÂ  la fois ; re-clic referme ; carte glissÃƒÂ©e sous le Header) ; Ã‚Â« + Nouveau Ã‚Â» garde son panneau en haut ; logique save() create/update offline-first inchangÃƒÂ©e ; JSX du formulaire factorisÃƒÂ© en CompteurForm. (6) Boutons d'action des cartes (QR/Modifier/Supprimer) Ã¢â€ â€™ icÃƒÂ´ne seule + title + aria-label, cibles 36px. Factorisation : scrollElementUnderHeader extrait dans utils/scrollUnderHeader.ts (iso-comportement, behavior:'instant' conservÃƒÂ©), importÃƒÂ© par EauCompteursReleves + EauCompteursPage. Modif partagÃƒÂ©e additive : constants/index.ts (rÃƒÂ©ordonnancement du jeu de nav eau). tsc --noEmit OK, build OK.",
    changes: [
      'constants/index.ts (PARTAGÃƒâ€°) : GESTION_EAU_NAV_ITEMS Ã¢â‚¬â€ Compteurs avant Suivi',
      'modules/gestion-eau/utils/scrollUnderHeader.ts : NOUVEAU Ã¢â‚¬â€ scrollElementUnderHeader factorisÃƒÂ© (iso-comportement)',
      'components/EauCompteursReleves.tsx : import util partagÃƒÂ© (copie locale retirÃƒÂ©e) ; bouton icÃƒÂ´ne Ã‚Â« Nouveau compteur Ã‚Â» ÃƒÂ  droite de Scan ; prop onNewCompteur',
      "components/EauRelevesPage.tsx : onNewCompteur Ã¢â€ â€™ navigate('/gestion-eau/compteurs?new=1')",
      'components/EauCompteursPage.tsx : ?new=1 ouvre la crÃƒÂ©ation ; formMode unifiÃƒÂ© {new|edit} ; ÃƒÂ©dition inline sous la carte ; glissement sous Header ; CompteurForm factorisÃƒÂ© ; actions cartes en icÃƒÂ´ne seule',
      'constants/appVersion.ts + package.json : version 3.55.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.54.0',
    date: '2026-06-15',
    description:
      "style(eau) : refonte visuelle Phase 2 Ã¢â‚¬â€ application du kit EauUi aux ÃƒÂ©crans secondaires + reports Phase 1 + audit final de charte. Reports Phase 1 : token ahuvi-gold-700 (#6f6d33, contraste Ã¢â€°Ë† 5,37:1 sur blanc) ajoutÃƒÂ© dans tailwind.config.js et appliquÃƒÂ© au TEXTE or ÃƒÂ  faible contraste (TONE_VALUE.gold de EauStatCard Ã¢â€ â€™ KPI Ã‚Â« Conso ÃƒÂ©lectrique Ã‚Â» du Dashboard ; accents ÃƒÂ©lec text-[#8a8836] rÃƒÂ©siduels de EauCompteursReleves ; badge Ã¢â€”Â nouveau de EauAlertesPage ; badge rÃƒÂ´le de EauDemandesPage) ; #9D9B4B (ahuvi-gold) conservÃƒÂ© pour surfaces/icÃƒÂ´nes/sÃƒÂ©ries de graphes ; pin Leaflet de EauCartePage Ã¢â€ â€™ EAU_CHART.forest (plus d'hex #364E30 en dur). EauTendancesPage : ChartCard local supprimÃƒÂ© Ã¢â€ â€™ EauChartCard ; consts couleurs adossÃƒÂ©es ÃƒÂ  EAU_CHART (FOREST/OLIVE/GOLD/TEAL/ROSE) + grille #eee Ã¢â€ â€™ EAU_CHART.grid ; icÃƒÂ´nes de titres. EauProprietaireBassinPage : carte niveau Ã¢â€ â€™ EauChartCard + EAU_CHART.teal. Bordures border-gray-200 des cartes/listes Ã¢â€ â€™ border-ahuvi-100 (Demandes, Annonces, Audit, Config, Rapports, Utilisateurs, Alertes, TiroirSaisie photo). Micro-interactions : animate-fade-in sur les listes/sections principales ; cibles tactiles agrandies (boutons Modifier/Supprimer/Fermer d'Annonces Ã¢â€ â€™ 44px ; TraitÃƒÂ©/Lu d'Alertes Ã¢â€ â€™ min-h 44px). Passe Impeccable bridÃƒÂ©e AHUVI (audit/critique/polish). PrÃƒÂ©sentationnel pur : aucune logique, donnÃƒÂ©e, libellÃƒÂ© mÃƒÂ©tier ni navigation modifiÃƒÂ©s ; isAnimationActive={false} conservÃƒÂ© ; offline-first inchangÃƒÂ©. tsc --noEmit OK, build OK.",
    changes: [
      'tailwind.config.js : +token ahuvi-gold-700 (#6f6d33, encre or accessible Ã¢â€°Â¥ 4,5:1)',
      'components/EauUi.tsx : TONE_VALUE.gold Ã¢â€ â€™ text-ahuvi-gold-700 (valeur texte accessible ; surfaces/icÃƒÂ´nes restent #9D9B4B)',
      'components/EauTendancesPage.tsx : ChartCard local supprimÃƒÂ© Ã¢â€ â€™ EauChartCard ; couleurs Ã¢â€ â€™ EAU_CHART ; grille Ã¢â€ â€™ EAU_CHART.grid ; icÃƒÂ´nes de titres',
      'components/EauProprietaireBassinPage.tsx : carte niveau Ã¢â€ â€™ EauChartCard + EAU_CHART.teal',
      'components/EauCartePage.tsx : pin Leaflet #364E30 Ã¢â€ â€™ EAU_CHART.forest',
      'components/EauCompteursReleves.tsx : accents ÃƒÂ©lec text-[#8a8836] Ã¢â€ â€™ text-ahuvi-gold-700',
      'components/EauDemandesPage.tsx : badge rÃƒÂ´le or Ã¢â€ â€™ ahuvi-gold/15 + gold-700 ; cartes border-gray-200 Ã¢â€ â€™ border-ahuvi-100',
      'Bordures cartes/listes border-gray-200 Ã¢â€ â€™ border-ahuvi-100 (Annonces, Audit, Config, Rapports, Utilisateurs, Alertes, TiroirSaisie)',
      'Micro-interactions : animate-fade-in sur listes/sections principales',
      'Cibles tactiles : boutons Modifier/Supprimer/Fermer (Annonces) Ã¢â€ â€™ 44px ; TraitÃƒÂ©/Lu (Alertes) Ã¢â€ â€™ min-h 44px',
      'constants/appVersion.ts + package.json : version 3.54.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.53.0',
    date: '2026-06-14',
    description:
      "style(eau) : refonte visuelle Phase 1 Ã¢â‚¬â€ centralisation du kit d'UI + suppression du bleu/gris gÃƒÂ©nÃƒÂ©rique + palette de graphes unique. EauUi.tsx (partagÃƒÂ© intra-module) : ajout EauCard, EauChartCard, EauSectionTitle, EauShortcut et EAU_CHART (tokens recharts source unique : forest/olive/gold/goldLight/teal/rose/elec/grid) ; tones gold/teal de EauStatCard adossÃƒÂ©s aux tokens AHUVI (bg-ahuvi-gold/15, cyan-50) au lieu d'hex arbitraires ; tous rÃƒÂ©-exportÃƒÂ©s par components/index.ts. Suppression de TOUT le bleu (boutons Ã‚Â« Modifier Ã‚Â» EauCompteursReleves/EauCompteursPage/EauBassinReleves Ã¢â€ â€™ style secondaire AHUVI border-ahuvi-200 text-ahuvi-forest). Bordures border-gray-200/300 des cartes/listes Ã¢â€ â€™ border-ahuvi-100 (Anomalies, Compteurs, Carte, Facturation, Client, histo Compteurs/Bassin). Couleurs de sÃƒÂ©ries recharts alignÃƒÂ©es sur EAU_CHART dans EauDashboard/EauCompteursReleves/EauBassinReleves/EauFacturationPage/EauClientPage (plus aucun hex de graphe en dur ; isAnimationActive={false} conservÃƒÂ©). Composants locaux dupliquÃƒÂ©s supprimÃƒÂ©s : Card (EauDashboard Ã¢â€ â€™ EauCard/EauChartCard + CardHeader extrait), RaccourciButton (EauRelevesPage Ã¢â€ â€™ EauShortcut). Passe Impeccable bridÃƒÂ©e AHUVI (audit/critique/polish) : aria-label sur la recherche compteur, titres de cartes-graphe harmonisÃƒÂ©s. PrÃƒÂ©sentationnel pur : aucune logique, donnÃƒÂ©e, libellÃƒÂ© mÃƒÂ©tier ni navigation modifiÃƒÂ©s ; offline-first inchangÃƒÂ©. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauUi.tsx : +EauCard, EauChartCard, EauSectionTitle, EauShortcut, EAU_CHART ; tones gold/teal sur tokens AHUVI',
      'components/index.ts : rÃƒÂ©-export du kit (EauCard/EauChartCard/EauSectionTitle/EauShortcut/EAU_CHART + bricks existantes)',
      'Suppression du bleu : boutons Modifier (EauCompteursReleves, EauCompteursPage, EauBassinReleves) Ã¢â€ â€™ secondaire AHUVI',
      'Bordures cartes/listes border-gray-200/300 Ã¢â€ â€™ border-ahuvi-100 (Anomalies, Compteurs, Carte, Facturation, Client, Compteurs/Bassin)',
      'Recharts : couleurs de sÃƒÂ©ries Ã¢â€ â€™ EAU_CHART (Dashboard, CompteursReleves, BassinReleves, Facturation, Client)',
      'EauDashboard : Card local Ã¢â€ â€™ EauCard/EauChartCard (+CardHeader) ; EauRelevesPage : RaccourciButton Ã¢â€ â€™ EauShortcut',
      'a11y : aria-label sur la recherche compteur',
      'constants/appVersion.ts + package.json : version 3.53.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.52.1',
    date: '2026-06-14',
    description:
      "style(eau) : onglet Source Ã¢â‚¬â€ la carte Ã‚Â« Bassin Ã‚Â» adopte le pattern des cartes Compteur. EauBassinReleves.tsx : le rÃƒÂ©sumÃƒÂ© (icÃƒÂ´ne Ruler + Ã‚Â« Bassin Ã‚Â» + dÃƒÂ©tail hauteur/volume/date) devient un role=button cliquable (clavier Enter/Espace) qui ouvre/ferme le tiroir Historique ; le bouton Ã‚Â« Historique Ã‚Â» plein-largeur est supprimÃƒÂ© ; le bouton Ã‚Â« Saisir hauteur Ã‚Â» plein-largeur est remplacÃƒÂ© par un crayon compact (w-9 h-9, icÃƒÂ´ne Pencil seule, ÃƒÂ©tats actif bg-ahuvi-forest / inactif bg-ahuvi-50, disabled si isReadOnly||!dim) alignÃƒÂ© ÃƒÂ  droite (mt-1.5 flex justify-end), sÃ…â€œur du rÃƒÂ©sumÃƒÂ© avec stopPropagation Ã¢â‚¬â€ strictement calquÃƒÂ© sur le pencilButton de CompteurCard. Import lucide History retirÃƒÂ© (inutilisÃƒÂ©). PrÃƒÂ©sentationnel pur : drawers Saisir/Historique, calculs, openIntent/deep-links et offline-first inchangÃƒÂ©s. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauBassinReleves.tsx : carte Bassin Ã¢â‚¬â€ rÃƒÂ©sumÃƒÂ© cliquable Ã¢â€ â€™ tiroir Historique (bouton Historique supprimÃƒÂ©)',
      'components/EauBassinReleves.tsx : bouton Ã‚Â« Saisir hauteur Ã‚Â» plein-largeur Ã¢â€ â€™ crayon compact w-9 h-9 (paritÃƒÂ© cartes Compteur), stopPropagation',
      'components/EauBassinReleves.tsx : import lucide History retirÃƒÂ© (inutilisÃƒÂ©)',
      'constants/appVersion.ts + package.json : version 3.52.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.52.0',
    date: '2026-06-14',
    description:
      "feat(eau) : page RelevÃƒÂ©s rÃƒÂ©duite de 3 ÃƒÂ  2 onglets Ã¢â‚¬â€ Ã‚Â« Compteurs Ã‚Â» (inchangÃƒÂ©, les dÃƒÂ©bits) et Ã‚Â« Source Ã‚Â» (nouveau, fusion des ex-onglets Bassin + Apports = crÃƒÂ©dit + solde). EauRelevesPage.tsx Ã¢â‚¬â€ TabKey 'compteurs'|'source' ; EauTabs ÃƒÂ  2 entrÃƒÂ©es (Compteurs/Gauge, Source/Droplet) ; rendu 'source' = un seul EauBassinReleves avec creditsSlot=<EauApportsReleves/> ; deep-links re-routÃƒÂ©s (tab=bassin|apports Ã¢â€ â€™ 'source', bt entree/debit/niveau Ã¢â€ â€™ apportsAutoOpen/bassinIntent) sans changer le schÃƒÂ©ma d'URL ; raccourcis bas inchangÃƒÂ©s (goSaisirBassin/goAjouterApport Ã¢â€ â€™ 'source'). EauBassinReleves.tsx Ã¢â‚¬â€ prop optionnelle additive creditsSlot rendue entre la carte Bassin et la section Tests de dÃƒÂ©bit (ordre : Stock Ã¢â€ â€™ Bassin Ã¢â€ â€™ Apports Ã¢â€ â€™ Tests de dÃƒÂ©bit Ã¢â€ â€™ admin RelevÃƒÂ©s rÃƒÂ©cents). RÃƒÂ©organisation d'UI pure : aucun calcul de bilan, service, schÃƒÂ©ma Supabase ni RLS touchÃƒÂ© ; offline-first inchangÃƒÂ©. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauRelevesPage.tsx : 2 onglets Compteurs/Source ; onglet Apports supprimÃƒÂ© ; rendu source = EauBassinReleves + creditsSlot=EauApportsReleves',
      'components/EauRelevesPage.tsx : deep-links tab=bassin|apports re-routÃƒÂ©s vers source (schÃƒÂ©ma d\'URL inchangÃƒÂ©) ; imports Sprout/WavesÃ¢â€ â€™Droplet ajoutÃƒÂ©',
      'components/EauBassinReleves.tsx : prop additive creditsSlot rendue entre la carte Bassin et la section Tests de dÃƒÂ©bit',
      'FONCTIONNEMENT-MODULES.md : nouvelle structure page RelevÃƒÂ©s (Compteurs / Source)',
      'constants/appVersion.ts + package.json : version 3.52.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.51.6',
    date: '2026-06-14',
    description:
      "style(eau) : page Compteurs Ã¢â‚¬â€ le bouton Ã‚Â« Modifier Ã‚Â» d'une carte compteur adopte le pavÃƒÂ© bleu (bg-blue-100 text-blue-700, px-3 py-1.5 rounded-lg text-xs, hover:bg-blue-200, icÃƒÂ´ne NotebookPen w-3.5) identique au bouton Ã‚Â« MODIFIER Ã‚Â» du tiroir Historique des RelevÃƒÂ©s, au lieu du lien texte olive soulignÃƒÂ©. EauCompteursPage.tsx Ã¢â‚¬â€ className du bouton + icÃƒÂ´ne PencilÃ¢â€ â€™NotebookPen ; imports : Pencil retirÃƒÂ©, NotebookPen ajoutÃƒÂ©. onClick openEdit(c), title et libellÃƒÂ© Ã‚Â« Modifier Ã‚Â» inchangÃƒÂ©s. PrÃƒÂ©sentationnel pur. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursPage.tsx : bouton Ã‚Â« Modifier Ã‚Â» carte compteur en pavÃƒÂ© bleu (paritÃƒÂ© avec le tiroir Historique des RelevÃƒÂ©s), icÃƒÂ´ne NotebookPen',
      'components/EauCompteursPage.tsx : import Pencil retirÃƒÂ©, NotebookPen ajoutÃƒÂ©',
      'constants/appVersion.ts + package.json : version 3.51.6 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.51.5',
    date: '2026-06-13',
    description:
      "style(eau) : tiroir Ã‚Â« Saisir Ã‚Â» d'un relevÃƒÂ© compteur Ã¢â‚¬â€ l'icÃƒÂ´ne appareil photo passe en haut ÃƒÂ  droite (ligne du sÃƒÂ©lecteur Eau/Ãƒâ€°lec), serrÃƒÂ©e complÃƒÂ¨tement ÃƒÂ  droite, et remplace le bouton plein-largeur Ã‚Â« Prendre / choisir une photo Ã‚Â». EauTiroirSaisie.tsx Ã¢â‚¬â€ la ligne du sÃƒÂ©lecteur devient `flex items-center justify-between` ; ajout d'un `<label>` compact (w-10 h-10, icÃƒÂ´ne Camera seule) qui enveloppe l'input fichier cachÃƒÂ© (mÃƒÂªmes onPhotoChange, accept image/*, capture=environment, disabled isReadOnly||photoBusy) ; l'ancien bouton en pointillÃƒÂ©s est supprimÃƒÂ© ; le bloc d'aperÃƒÂ§u (vignette + Retirer) ne s'affiche plus que lorsqu'une photo existe. PrÃƒÂ©sentationnel pur : aucune logique photo/calcul touchÃƒÂ©e, hors-ligne inchangÃƒÂ©. tsc --noEmit OK.",
    changes: [
      'components/EauTiroirSaisie.tsx : icÃƒÂ´ne appareil photo dÃƒÂ©placÃƒÂ©e en haut ÃƒÂ  droite (justify-between), label compact w-10 h-10 enveloppant l\'input fichier cachÃƒÂ©',
      'components/EauTiroirSaisie.tsx : suppression du bouton plein-largeur Ã‚Â« Prendre / choisir une photo Ã‚Â» ; aperÃƒÂ§u photo conditionnÃƒÂ© ÃƒÂ  la prÃƒÂ©sence d\'une photo',
      'constants/appVersion.ts + package.json : version 3.51.5 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.51.4',
    date: '2026-06-13',
    description:
      "feat(eau) : ÃƒÂ©dition de la DATE des relevÃƒÂ©s dans le tiroir Historique des compteurs (admin). EauCompteursReleves.tsx (HistoriqueDrawer) Ã¢â‚¬â€ le mode MODIFIER ajoute, par relevÃƒÂ©, un champ `<input type=\"datetime-local\">` (date+heure locale) ÃƒÂ  cÃƒÂ´tÃƒÂ© de l'index et de la note. EditDraft gagne `datetime` ; `enterEdit` le sÃƒÂ¨me via `isoToLocalInput(r.date)` ; `dirty` compare aussi la date ; `handleSave` valide (non vide + refus du futur via `isFutureLocal`, comme la saisie bassin) et pousse `patch.timestamp = new Date(d.datetime).toISOString()` ÃƒÂ  `updateReleveCompteur`/`updateReleveElec` (dÃƒÂ©jÃƒÂ  gÃƒÂ©nÃƒÂ©riques sur le patch, aucun changement service). La conso d'intervalle se recalcule ÃƒÂ  la relecture (sÃƒÂ©ries triÃƒÂ©es par date croissante cÃƒÂ´tÃƒÂ© eau ET ÃƒÂ©lec). Helpers purs `isoToLocalInput`/`isFutureLocal` ajoutÃƒÂ©s localement (miroir EauBassinReleves). Offline-first inchangÃƒÂ©. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : champ date/heure (datetime-local) par relevÃƒÂ© en mode MODIFIER (eau + ÃƒÂ©lec)',
      'components/EauCompteursReleves.tsx : EditDraft.datetime + validation (refus date future/vide) + patch timestamp',
      'constants/appVersion.ts + package.json : version 3.51.4 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.51.3',
    date: '2026-06-13',
    description:
      "feat/style(eau) : tiroir Historique des compteurs Ã¢â‚¬â€ action admin dÃƒÂ©placÃƒÂ©e en bas + icÃƒÂ´nes carnet-crayon, et intÃƒÂ©gration du bouton Scan dans l'onglet Compteurs. EauCompteursReleves.tsx (HistoriqueDrawer) Ã¢â‚¬â€ le bloc d'action admin (avis post-enregistrement + bouton MODIFIER/ENREGISTRER) est dÃƒÂ©placÃƒÂ© du haut vers le BAS du tiroir, sous la liste des relevÃƒÂ©s (`flex justify-end`) ; le sÃƒÂ©lecteur Eau/Ãƒâ€°lec reste en haut (`{selecteur && Ã¢â‚¬Â¦}`). IcÃƒÂ´nes : MODIFIER et ENREGISTRER utilisent dÃƒÂ©sormais `NotebookPen` (w-3.5) au lieu de Pencil/Save ; `Save` retirÃƒÂ© des imports. EauBassinReleves.tsx Ã¢â‚¬â€ le crayon de correction d'un relevÃƒÂ© de niveau passe de `Pencil` ÃƒÂ  `NotebookPen` (couleur bleue et carrÃƒÂ© w-9 h-9 inchangÃƒÂ©s). Inclus aussi le dÃƒÂ©placement du bouton Ã‚Â« Scan Ã‚Â» (QR compteur) de EauRelevesPage.tsx vers l'onglet Compteurs via la prop `onScan`. Comportement/handlers/calculs inchangÃƒÂ©s, hors-ligne inchangÃƒÂ©. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : bouton MODIFIER/ENREGISTRER (+ avis) dÃƒÂ©placÃƒÂ© tout en bas du tiroir Historique ; sÃƒÂ©lecteur Eau/Ãƒâ€°lec reste en haut',
      'components/EauCompteursReleves.tsx : icÃƒÂ´nes NotebookPen (carnet+crayon) sur MODIFIER et ENREGISTRER (Save retirÃƒÂ© des imports)',
      'components/EauBassinReleves.tsx : crayon de correction d\'un relevÃƒÂ© de niveau Ã¢â€ â€™ NotebookPen',
      'components/EauRelevesPage.tsx : bouton Ã‚Â« Scan Ã‚Â» intÃƒÂ©grÃƒÂ© dans l\'onglet Compteurs via prop onScan (retirÃƒÂ© du haut de page)',
      'constants/appVersion.ts + package.json : version 3.51.3 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.51.2',
    date: '2026-06-13',
    description:
      "style(eau) : alignement vertical de la ligne d'infos des cartes compteur (prÃƒÂ©sentationnel pur, aucun handler/calcul/rÃƒÂ©seau/libellÃƒÂ© touchÃƒÂ©, hors-ligne inchangÃƒÂ©). EauCompteursReleves.tsx (cas `!never`) Ã¢â‚¬â€ le conteneur de la rangÃƒÂ©e infos+crayon passe de `flex items-start gap-2` ÃƒÂ  `flex items-end gap-2` : la ligne d'infos (Eau Ã‚Â· date Ã‚Â· conso) est dÃƒÂ©sormais alignÃƒÂ©e par le bas, sa base au niveau du bas du bouton crayon (w-9 h-9), au lieu d'ÃƒÂªtre collÃƒÂ©e en haut. Le cas `never` (crayon seul, justify-end) est inchangÃƒÂ©. tsc --noEmit OK.",
    changes: [
      'components/EauCompteursReleves.tsx : rangÃƒÂ©e infos+crayon items-start Ã¢â€ â€™ items-end (base alignÃƒÂ©e sur le bas du crayon)',
      'constants/appVersion.ts + package.json : version 3.51.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.51.1',
    date: '2026-06-13',
    description:
      "style(eau) : harmonisation prÃƒÂ©sentationnelle des boutons Ã‚Â« Modifier Ã‚Â» du module Eau sur le pavÃƒÂ© bleu de BazarKELY (Transactions/PrÃƒÂªts). Aucun handler/calcul/rÃƒÂ©seau/libellÃƒÂ© touchÃƒÂ©, hors-ligne inchangÃƒÂ©. EauCompteursReleves.tsx (HistoriqueDrawer, admin) Ã¢â‚¬â€ le bouton MODIFIER passe au style `bg-blue-100 text-blue-700 hover:bg-blue-200` (base `gap-1 text-xs`, icÃƒÂ´nes `w-3.5`) ; l'ÃƒÂ©tat modifiÃƒÂ© (ENREGISTRER) reste `bg-ahuvi-forest text-white` (vert) pour rester distinct ; le ternaire 3 ÃƒÂ©tats (blanc/gris-vert/vert) est rÃƒÂ©duit ÃƒÂ  `dirty ? vert : bleu`. EauBassinReleves.tsx Ã¢â‚¬â€ le crayon icÃƒÂ´ne-seule par ligne (ÃƒÂ©dition relevÃƒÂ© de niveau) passe de `text-ahuvi-forest hover:bg-ahuvi-50` ÃƒÂ  `text-blue-700 hover:bg-blue-100` (reste un carrÃƒÂ© `w-9 h-9`). LibellÃƒÂ©s conservÃƒÂ©s en MAJUSCULES. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : bouton MODIFIER Ã¢â€ â€™ pavÃƒÂ© bleu (BazarKELY) ; ENREGISTRER reste vert',
      'components/EauBassinReleves.tsx : crayon de correction d\'un relevÃƒÂ© de niveau Ã¢â€ â€™ accent bleu',
      'constants/appVersion.ts + package.json : version 3.51.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.51.0',
    date: '2026-06-13',
    description:
      "feat(eau) : 2 finitions UI page RelevÃƒÂ©s v2 (prÃƒÂ©sentationnel pur, aucun calcul/rÃƒÂ©seau touchÃƒÂ©). EauCompteursReleves.tsx (CompteurCard) Ã¢â‚¬â€ le bouton Ã‚Â« Saisir Ã‚Â» pleine largeur est remplacÃƒÂ© par un bouton icÃƒÂ´ne-crayon compact (w-9 h-9, lucide Pencil) : ligne d'infos sortie du rÃƒÂ©sumÃƒÂ© cliquable pour former une rangÃƒÂ©e `flex items-start gap-2` (infos `flex-1 min-w-0` ÃƒÂ  gauche, crayon `flex-shrink-0` ÃƒÂ  droite) ; cas `never` (aucun relevÃƒÂ©) Ã¢â€ â€™ crayon seul `justify-end` sous l'identitÃƒÂ© (saisie du 1Ã¡Âµâ€°ÃŠÂ³ relevÃƒÂ© toujours possible). Le crayon reste SÃ…â€™UR du rÃƒÂ©sumÃƒÂ© `role=button` (jamais imbriquÃƒÂ©) : clic crayon `stopPropagation` Ã¢â€ â€™ tiroir Saisir, clic carte Ã¢â€ â€™ Historique ; actif `bg-ahuvi-forest text-white` sinon `bg-ahuvi-50 Ã¢â‚¬Â¦`, `disabled={isReadOnly}`, `aria-label`. EauBassinReleves.tsx Ã¢â‚¬â€ la carte Ã‚Â« Stock d'eau du bassin Ã‚Â» devient cliquable (role/button, tabIndex, aria-expanded, EntrÃƒÂ©e/Espace, focus ring) ; affordance `Info + Ã‚Â« Comprendre cette situation Ã‚Â» + ChevronDown` qui pivote ; au clic, tiroir (composant Drawer existant) dÃƒÂ©pliÃƒÂ© SOUS les chiffres affichant UN seul cas (AÃ¢â€ â€™F) selon `bilan` null / `anomalie` / signe `ecart_m3` (EPS 0,05 mÃ‚Â³) avec titre + texte FR validÃƒÂ© + conseil, ton vert/ambre/rose/neutre. Import Info ajoutÃƒÂ©. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : crayon compact (icÃƒÂ´ne seule) ÃƒÂ  droite de la ligne d\'infos, bouton Ã‚Â« Saisir Ã‚Â» pleine largeur supprimÃƒÂ© ; cas sans relevÃƒÂ© gÃƒÂ©rÃƒÂ©',
      'components/EauBassinReleves.tsx : carte Ã‚Â« Stock d\'eau du bassin Ã‚Â» cliquable Ã¢â€ â€™ tiroir Ã‚Â« Comprendre cette situation Ã‚Â» (6 cas AÃ¢â€ â€™F, textes FR validÃƒÂ©s)',
      'constants/appVersion.ts + package.json : version 3.51.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.50.2',
    date: '2026-06-13',
    description:
      "fix(gestion-eau) : dÃƒÂ©clenchement du scroll Ã‚Â« carte sous le Header Ã‚Â» (Point 2) fiabilisÃƒÂ©. La v3.50.1 forÃƒÂ§ait bien `behavior:'instant'` mais le scroll n'ÃƒÂ©tait JAMAIS appelÃƒÂ© (validÃƒÂ© en prod : scrollTop figÃƒÂ© ÃƒÂ  0 sur toute l'animation alors que le tiroir s'ouvrait) Ã¢â‚¬â€ le scroll ÃƒÂ©tait planifiÃƒÂ© DANS l'updater de `setOpenKey`, oÃƒÂ¹ `cardRefs.current.get(id)` renvoyait null (refs non garanties pendant la phase de rendu). Correctif : dÃƒÂ©placer le scroll dans un `useEffect([openKey])` post-commit (refs attachÃƒÂ©es) + retirer le `scrollIntoView` redondant du chemin preselect (deep-link) au profit du mÃƒÂªme effet (alignement cohÃƒÂ©rent sous le Header). tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : scroll dÃƒÂ©placÃƒÂ© de l\'updater setOpenKey vers useEffect([openKey]) (refs fiables post-commit)',
      'components/EauCompteursReleves.tsx : preselect deep-link n\'appelle plus scrollIntoView (l\'effet [openKey] aligne sous le Header)',
      'constants/appVersion.ts + package.json : version 3.50.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.50.1',
    date: '2026-06-13',
    description:
      "fix(gestion-eau) : le scroll Ã‚Â« carte sous le Header Ã‚Â» (Point 2 de v3.50.0) ne se dÃƒÂ©clenchait pas sur les pages du module Ã¢â‚¬â€ le shell pose `scroll-behavior: smooth` sur <html>, donc le `window.scrollTo(0, y)` par image de scrollElementUnderHeader hÃƒÂ©ritait du smooth natif et relanÃƒÂ§ait une animation ÃƒÂ  chaque frame Ã¢â€ â€™ mouvement net nul (validÃƒÂ© en prod : scrollTop figÃƒÂ© malgrÃƒÂ© le clic ; `window.scrollTo({behavior:'instant'})` bouge bien). Correctif : forcer `behavior: 'instant'` sur chaque scroll de l'animation maison (l'easing reste gÃƒÂ©rÃƒÂ© par notre rAF) Ã¢â‚¬â€ robuste aussi sur les pages sans smooth. Points 1/3/4 (clic carte = Historique, ÃƒÂ©dition admin des relevÃƒÂ©s, libellÃƒÂ© bassin) dÃƒÂ©jÃƒÂ  validÃƒÂ©s en prod sur v3.50.0. tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : scrollElementUnderHeader force window.scrollTo({behavior:\'instant\'}) (override du scroll-behavior:smooth du shell)',
      'constants/appVersion.ts + package.json : version 3.50.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.50.0',
    date: '2026-06-13',
    description:
      "feat(gestion-eau) : retouches cartes Compteurs (clic carte = Historique, scroll sous header, ÃƒÂ©dition admin des relevÃƒÂ©s) + libellÃƒÂ© bassin Ã‚Â« Stock d'eau du bassin Ã‚Â» (dÃƒÂ©jÃƒÂ  v3.49.1, vÃƒÂ©rifiÃƒÂ©). EauCompteursReleves.tsx Ã¢â‚¬â€ Point 1 : le corps de la carte (rÃƒÂ©sumÃƒÂ©) devient cliquable (role/button, tabIndex, aria-expanded, EntrÃƒÂ©e/Espace) et bascule le tiroir Historique ; bouton Ã‚Â« Historique Ã‚Â» supprimÃƒÂ© ; bouton Ã‚Â« Saisir Ã‚Â» conservÃƒÂ© avec stopPropagation. Point 2 : ÃƒÂ  l'ouverture d'un tiroir (Saisir ou Historique), scrollElementUnderHeader fait glisser le bord haut de la carte juste sous le Header (rÃƒÂ©plique TransactionsPage.toggleTransactionDrawer : rAF + ease-in-out cubique, cible recalculÃƒÂ©e par image, respect prefers-reduced-motion). Point 3 : HistoriqueDrawer reÃƒÂ§oit isAdmin + onReload ; admin Ã¢â€ â€™ bouton MODIFIER (index + note des 6 relevÃƒÂ©s affichÃƒÂ©s, par nature eau/ÃƒÂ©lec ÃƒÂ©ditables), bascule en ENREGISTRER au 1Ã¡Âµâ€°ÃŠÂ³ changement Ã¢â€ â€™ persistance offline-first idempotente (eau updateReleveCompteur, ÃƒÂ©lec updateReleveElec), conso recalculÃƒÂ©e ÃƒÂ  la relecture, toast + encart Ã‚Â« Recalculer tous les bilans Ã‚Â» ; non-admin = pas de bouton. eauReleveService.ts : updateReleveCompteur(id, patch) AJOUTÃƒâ€° (miroir updateReleveElec/Bassin : saveLocal upsert idempotent, _dirty, withTimeout). RLS : eau_releves_compteur / eau_elec_releves_compteur UPDATE admin dÃƒÂ©jÃƒÂ  en place (4 policies sel/ins/upd/del). tsc --noEmit OK, build OK.",
    changes: [
      'components/EauCompteursReleves.tsx : carte cliquable Ã¢â€ â€™ Historique (Point 1), bouton Historique supprimÃƒÂ©, Saisir + stopPropagation',
      'components/EauCompteursReleves.tsx : scrollElementUnderHeader (Point 2, patron TransactionsPage) dÃƒÂ©clenchÃƒÂ© ÃƒÂ  l\'ouverture d\'un tiroir',
      'components/EauCompteursReleves.tsx : HistoriqueDrawer ÃƒÂ©dition admin (Point 3) MODIFIER/ENREGISTRER + avis recalcul bilans',
      'services/eauReleveService.ts : updateReleveCompteur(id, patch) [NOUVEAU] (miroir updateReleveElec, offline-first idempotent)',
      'components/EauBassinReleves.tsx : libellÃƒÂ© Ã‚Â« Stock d\'eau du bassin Ã‚Â» (Point 4, dÃƒÂ©jÃƒÂ  v3.49.1 Ã¢â‚¬â€ vÃƒÂ©rifiÃƒÂ©)',
      'constants/appVersion.ts + package.json : version 3.50.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.49.1',
    date: '2026-06-13',
    description:
      "chore(gestion-eau) : libellÃƒÂ© carte bassin Ã‚Â« Stock d'eau du bassin Ã‚Â» au lieu de Ã‚Â« Solde du bassin Ã‚Â» (affichage uniquement). EauBassinReleves.tsx : titre de carte + mention Ã‚Â« Stock de rÃƒÂ©fÃƒÂ©rence Ã¢â‚¬â€ Ã¢â‚¬Â¦ Ã‚Â» (cas bilan absent) + commentaires. EauRelevesPage.tsx : commentaire d'en-tÃƒÂªte. Aucun changement de calcul/logique (computeBilan, stockMesure/stockAttendu/ecart, sous-libellÃƒÂ©s MesurÃƒÂ©/Attendu/Ãƒâ€°cart inchangÃƒÂ©s). tsc --noEmit OK, build OK.",
    changes: [
      'components/EauBassinReleves.tsx : titre Ã‚Â« Stock d\'eau du bassin Ã‚Â» + Ã‚Â« Stock de rÃƒÂ©fÃƒÂ©rence Ã¢â‚¬â€ Ã¢â‚¬Â¦ Ã‚Â» + commentaires',
      'components/EauRelevesPage.tsx : commentaire d\'en-tÃƒÂªte (stock d\'eau)',
      'constants/appVersion.ts + package.json : version 3.49.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.49.0',
    date: '2026-06-13',
    description:
      "feat(gestion-eau) : modele d'apport Ã‚Â« flotteur Ã‚Â» (Phase 3, bande -10 cm) + saisie debit par hauteur/heure. utils/bilan.ts : nouveau helper pur estimerApportFlotteur (priorite override > entrees > mesure (bilan de matiere ÃŽâ€stock + conso metree, plafonne a V_flotteur = surface x Hf) > repli debit x ÃŽâ€t x FRACTION_POMPE plafonne, gate bande de regulation stockPrev >= V_bas) ; remplace l'ancien apport debit x ÃŽâ€t x FRACTION_POMPE qui surestimait. BilanResult expose apportMode ; helper isApportDebitMode pour l'UI (derivation sans persistance). computeBilan recoit surfaceM2/hauteurFlotteurM/bandFlotteurM depuis eauBilanService (config). eau_config : colonne bassin_band_flotteur_cm (defaut 10) refletee dans ConfigRow/ConfigLocal + emptyConfig + helper bandFlotteurMFromConfig (repli 0,10 m) + champ EauConfigPage. EauBassinReleves : test de debit saisi par hauteur debut/fin (cm) + heure debut/fin (duree derivee, gestion passage minuit). EauApportsReleves : carte Apport estime (dernier bilan) avec libelle flotteur/debit. FRACTION_POMPE reste source unique (re-exportee par projection/consoEstimee), reduite au repli documente. Tests : eauApportFlotteur.test.ts (14) + maj eauBassinDebit.test.ts. tsc --noEmit OK, build OK.",
    changes: [
      'modules/gestion-eau/utils/bilan.ts : helper pur estimerApportFlotteur + ApportMode + EstimerApportInput/Result + isApportDebitMode ; computeBilan branche le modele flotteur (surface/flotteur/bande) ; BilanResult.apportMode',
      'modules/gestion-eau/services/eauBilanService.ts : injecte surfaceM2/hauteurFlotteurM/bandFlotteurM (config) dans computeBilan',
      'modules/gestion-eau/services/eauConfigService.ts : bandFlotteurMFromConfig (repli 0,10 m) + emptyConfig',
      'modules/gestion-eau/types/gestionEau.ts : ConfigRow.bassin_band_flotteur_cm',
      'modules/gestion-eau/components/EauConfigPage.tsx : champ Bande flotteur (cm)',
      'modules/gestion-eau/components/EauBassinReleves.tsx : test de debit par hauteur + heure debut/fin (duree derivee)',
      'modules/gestion-eau/components/EauApportsReleves.tsx : carte Apport estime (modele flotteur, libelle mesure/debit)',
      'modules/gestion-eau/__tests__/eauApportFlotteur.test.ts [NOUVEAU] + maj eauBassinDebit.test.ts',
      'SQL : ALTER TABLE eau_config ADD COLUMN bassin_band_flotteur_cm numeric (defaut 10) Ã¢â‚¬â€ idempotent',
      'constants/appVersion.ts + package.json : version 3.49.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.48.1',
    date: '2026-06-13',
    description:
      "fix(cache) : stopper l'index.html pÃƒÂ©rimÃƒÂ© servi aprÃƒÂ¨s dÃƒÂ©ploiement (cache edge Cloudflare + Service Worker). Couche A Ã¢â‚¬â€ public/_headers : `Cache-Control: no-cache` (revalidation systÃƒÂ©matique, PAS no-store) sur la racine `/` (start_url PWA) et `/index.html`, car les routes SPA sans extension `.html` (servies via _redirects /* /index.html 200) ÃƒÂ©chappaient ÃƒÂ  la rÃƒÂ¨gle /*.html et pouvaient ÃƒÂªtre mises en cache au bord. Couche B Ã¢â‚¬â€ src/sw-custom.ts : la navigation SPA passe de Ã‚Â« cache d'abord Ã‚Â» (createHandlerBoundToURL) ÃƒÂ  NetworkFirst (cacheName html-cache, networkTimeoutSeconds 3) avec repli offline sur l'index.html prÃƒÂ©cachÃƒÂ© (matchPrecache via handlerDidError). En ligne : document toujours frais (le no-cache de la Couche A contourne l'edge pÃƒÂ©rimÃƒÂ©). Hors-ligne : l'app charge depuis le prÃƒÂ©cache. InchangÃƒÂ©s : precacheAndRoute/__WB_MANIFEST, cleanupOutdatedCaches, skipWaiting+clientsClaim, api-cache NetworkFirst, prÃƒÂ©cache Tesseract (/tesseract/* wasm/gz), denylist navigation (/api/*, /supabase/*, assets, /sw*.js, /workbox-*, /manifest*), repli SPA _redirects, Pages Functions (/i/*, /og-invite.png, /api/ocr-receipt). tsc --noEmit OK, build OK.",
    changes: [
      'public/_headers : rÃƒÂ¨gles no-cache pour `/` et `/index.html` (document d\'entrÃƒÂ©e SPA jamais servi pÃƒÂ©rimÃƒÂ© par l\'edge Cloudflare)',
      'src/sw-custom.ts : navigation SPA NetworkFirst (timeout 3 s) + repli prÃƒÂ©cache offline (matchPrecache) au lieu de createHandlerBoundToURL Ã‚Â« cache d\'abord Ã‚Â»',
      'constants/appVersion.ts + package.json : version 3.48.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.48.0',
    date: '2026-06-13',
    description:
      'feat(gestion-eau) : refonte page RelevÃƒÂ©s Ã‚Â« faÃƒÂ§on Transactions Ã‚Â» Ã¢â‚¬â€ Phase 2 (onglets Bassin & Apports + finitions). Onglet Bassin (EauBassinReleves) : carte Ã‚Â« Solde du bassin Ã‚Â» (mesurÃƒÂ© + % remplissage rÃƒÂ©f. flotteur via getDashboardData, attendu = stock_attendu du dernier bilan, ÃƒÂ©cart mÃ‚Â³/pct avec ton anomalie) ; carte Ã‚Â« Bassin Ã‚Â» ÃƒÂ  tiroirs Saisir hauteur (conversion cmÃ¢â€ â€™mÃ‚Â³ live, addReleveBassin dÃƒÂ©clenche un bilan) et Historique (6 derniers niveaux + mini-courbe) ; section repliable Ã‚Â« Tests de dÃƒÂ©bit Ã‚Â» (dÃƒÂ©bit courant getDebitCourantM3h, liste + nouveau test addDebitTest) ; section admin/releveur Ã‚Â« RelevÃƒÂ©s rÃƒÂ©cents Ã‚Â» (ÃƒÂ©dition/suppression + recalcul) conservÃƒÂ©e. Onglet Apports (EauApportsReleves) : KPI apports cumulÃƒÂ©s pÃƒÂ©riode, tiroir Ajouter (volume+note+date, addEntreeBassin idempotent offline-first), liste des derniers apports. Deep-links prÃƒÂ©servÃƒÂ©s (schÃƒÂ©ma ?bt= inchangÃƒÂ©, EauDashboard/eauInvitationService non touchÃƒÂ©s) : ?bt=niveauÃ¢â€ â€™Bassin/Saisir, ?bt=debitÃ¢â€ â€™Bassin/Tests, ?bt=entreeÃ¢â€ â€™Apports/Ajouter, ?tab=elecÃ¢â€ â€™Compteurs + tiroir Saisir sur Ãƒâ€°lec (compteur au relevÃƒÂ© ÃƒÂ©lec le plus rÃƒÂ©cent). Historique multi-nature (sÃƒÂ©lecteur eau/ÃƒÂ©lec) sur compteur dual. Nettoyage : EauSaisieBassinPage/EauSaisieCompteurPage/EauSaisieElecPage/EauTourneePage supprimÃƒÂ©s (orphelins, zÃƒÂ©ro import). utils/bilan.ts NON modifiÃƒÂ© (Phase 3). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauRelevesPage.tsx (PARTAGÃƒâ€°) : 3 onglets actifs + routage deep-links ?bt=niveau|debit|entree + ?tab=elec + raccourcis Saisir bassin/Ajouter apport',
      'modules/gestion-eau/components/EauBassinReleves.tsx : onglet Bassin faÃƒÂ§on Transactions [NOUVEAU]',
      'modules/gestion-eau/components/EauApportsReleves.tsx : onglet Apports faÃƒÂ§on Transactions [NOUVEAU]',
      'modules/gestion-eau/components/EauCompteursReleves.tsx : deep-link ÃƒÂ©lec (prÃƒÂ©selection compteur + nature Ãƒâ€°lec) + historique multi-nature (sÃƒÂ©lecteur eau/ÃƒÂ©lec)',
      'modules/gestion-eau/services/eauReleveService.ts : + listEntreesBassin()',
      'modules/gestion-eau/components/{EauSaisieBassinPage,EauSaisieCompteurPage,EauSaisieElecPage,EauTourneePage}.tsx : SUPPRIMÃƒâ€°S (orphelins, zÃƒÂ©ro import)',
      'constants/appVersion.ts + package.json : version 3.48.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.47.1',
    date: '2026-06-13',
    description:
      'fix(auth) : retour OAuth jamais consommÃƒÂ© quand un drapeau isAuthenticated pÃƒÂ©rimÃƒÂ© subsistait (session Supabase expirÃƒÂ©e mais store encore Ã‚Â« connectÃƒÂ© Ã‚Â»). main.tsx capture les jetons du hash dans sessionStorage, mais AppLayout, voyant isAuthenticated=true (pÃƒÂ©rimÃƒÂ©), routait /auth Ã¢â€ â€™ Navigate /dashboard Ã¢â€ â€™ AuthPage jamais montÃƒÂ©e Ã¢â€ â€™ jetons jamais consommÃƒÂ©s Ã¢â€ â€™ aucune session ÃƒÂ©tablie Ã¢â€ â€™ espace eau Ã‚Â« Reconnexion requise Ã‚Â» en boucle. Correctif additif : route /auth ajoutÃƒÂ©e dans la branche AUTHENTIFIÃƒâ€°E dÃ¢â‚¬â„¢AppLayout, qui rend AuthPage quand sessionStorage contient des jetons OAuth en attente (sinon redirige /dashboard comme avant). AuthPage consomme alors les jetons (setSession) et ÃƒÂ©tablit la vraie session. Aucun changement des rÃƒÂ¨gles setAuthenticated (toujours false sur SIGNED_OUT seulement) ni du flux normal (login, navigation, offline). tsc --noEmit OK, build OK. ValidÃƒÂ© en navigateur sur 1sakely.org (session admin rÃƒÂ©tablie).',
    changes: [
      'components/Layout/AppLayout.tsx : branche authentifiÃƒÂ©e Ã¢â‚¬â€ route /auth rend AuthPage si jetons OAuth en attente (sessionStorage), sinon Navigate /dashboard',
      'constants/appVersion.ts + package.json : version 3.47.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.47.0',
    date: '2026-06-13',
    description:
      'feat(gestion-eau) : refonte de la page RelevÃƒÂ©s Ã‚Â« faÃƒÂ§on Transactions Ã‚Â» Ã¢â‚¬â€ Phase 1 (socle + onglet Compteurs). Shell 3 onglets (Compteurs/Bassin/Apports) + bouton Scan intÃƒÂ©grÃƒÂ© DANS la page (EauQrScanner conservÃƒÂ© in-page) + aide dÃƒÂ©pliable + badge lecture seule. Onglet Compteurs (EauCompteursReleves) : 2 KPI (conso eau sur pÃƒÂ©riode 7j/30j/1an persistÃƒÂ©e localStorage `ahuvi_releves_periode` + progression du jour faits/total via getTourneeData) ; recherche nom/propriÃƒÂ©taire/zone ; chips de pÃƒÂ©riode ; cartes-compteur eau+ÃƒÂ©lec mÃƒÂ©langÃƒÂ©es et dÃƒÂ©dupliquÃƒÂ©es (icÃƒÂ´ne Droplet/Zap, dernier index + date + conso mÃ‚Â³/kWh) triÃƒÂ©es Ã‚Â« mode tournÃƒÂ©e Ã‚Â» (jamais relevÃƒÂ© Ã¢â€ â€™ ÃƒÂ  relever aujourdÃ¢â‚¬â„¢hui Ã¢â€ â€™ fait, ordre zone/ordre/nom) ; tiroirs accordÃƒÂ©on (un seul ouvert) Saisir (EauTiroirSaisie : rÃƒÂ©utilise evaluer/addReleveCompteur + evaluer/addReleveElec, sÃƒÂ©lecteur eau/ÃƒÂ©lec, rupture + aberrant + photo + note, idempotent offline-first) et Historique (6 derniers relevÃƒÂ©s, 3 empilÃƒÂ©s + scroll, mini-graphe recharts isAnimationActive=false). Deep-link `?tab=compteur&c=<id>` (scan) prÃƒÂ©selectionne le compteur et ouvre sa saisie. Onglet Bassin CONSERVÃƒâ€° fonctionnel (EauSaisieBassinPage) pour ne pas casser les deep-links `?tab=bassin&bt=Ã¢â‚¬Â¦` (cartes bassin du tableau de bord + atterrissage invitation admin/releveur) ; onglet Apports = coquille Ã‚Â« bientÃƒÂ´t Ã‚Â» (Phase 2). Services additifs : relevesByCompteur() / relevesElecByCompteur() (lecture Dexie groupÃƒÂ©e). Aucune nouvelle table. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauRelevesPage.tsx : refonte shell 3 onglets + Scan in-page + raccourcis (PARTAGÃƒâ€° : deep-links scan/bassin prÃƒÂ©servÃƒÂ©s)',
      'modules/gestion-eau/components/EauCompteursReleves.tsx : onglet Compteurs (KPI, recherche, chips, cartes, tiroirs) [NOUVEAU]',
      'modules/gestion-eau/components/EauTiroirSaisie.tsx : tiroir Saisir mutualisÃƒÂ© eau/ÃƒÂ©lec [NOUVEAU]',
      'modules/gestion-eau/services/eauReleveService.ts : + relevesByCompteur()',
      'modules/gestion-eau/services/eauElecReleveService.ts : + relevesElecByCompteur()',
      'constants/appVersion.ts + package.json : version 3.47.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.46.12',
    date: '2026-06-12',
    description: 'fix(navigation) : reprise du dernier module Ã¢â‚¬â€ corrige le timing sur la racine \'/\'. La 3.46.11 figeait la garde one-shot dÃƒÂ¨s le 1er rendu sur \'/\', mais la navigation de reprise y perdait la course contre la redirection \'/\' Ã¢â€ â€™ \'/dashboard\' d\'AppLayout (<Navigate replace>) Ã¢â€ â€™ la reprise n\'avait jamais lieu et l\'ÃƒÂ©tiquette ÃƒÂ©tait ÃƒÂ©crasÃƒÂ©e en \'bazarkely\'. Correctif : \'/\' n\'est plus une adresse de DÃƒâ€°CISION mais une adresse de lancement transitoire Ã¢â‚¬â€ l\'effet ne consomme PAS la garde sur \'/\' et retente de faÃƒÂ§on dÃƒÂ©terministe sur \'/dashboard\' (adresse stable, sans redirection concurrente), oÃƒÂ¹ la reprise s\'effectue (chemin ÃƒÂ©prouvÃƒÂ© depuis v3.31.4). La garde n\'est figÃƒÂ©e que sur une adresse stable (\'/dashboard\' ou une route de module). Comportement validÃƒÂ© navigateur sur 1sakely.org (Gestion Eau / Construction / BazarKELY, liens directs, F5). tsc --noEmit OK, build OK.',
    changes: [
      'contexts/ModuleSwitcherContext.tsx : \'/\' = adresse transitoire (defer vers \'/dashboard\'), garde figÃƒÂ©e seulement sur adresse stable',
      'constants/appVersion.ts + package.json : version 3.46.12',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.11',
    date: '2026-06-12',
    description: 'feat(navigation) : reprise du dernier module ÃƒÂ  la rÃƒÂ©ouverture ÃƒÂ©tendue ÃƒÂ  la racine \'/\' (start_url de la PWA). ModuleSwitcherContext.tsx Ã¢â‚¬â€ (1) effet de reprise one-shot dÃƒÂ©sormais ÃƒÂ©ligible sur \'/\' OU \'/dashboard\' (avant : \'/dashboard\' seul) ; au lancement de l\'app installÃƒÂ©e (qui s\'ouvre sur \'/\'), la reprise s\'exÃƒÂ©cute au lieu d\'ÃƒÂªtre grillÃƒÂ©e. Timing one-shot durci : la garde hasCheckedStorage n\'est figÃƒÂ©e qu\'aprÃƒÂ¨s ÃƒÂ©valuation d\'une adresse ÃƒÂ©ligible (\'/\' ou \'/dashboard\') OU d\'une adresse de module (respectÃƒÂ©e, jamais de reprise) ; un 1er rendu transitoire non ÃƒÂ©ligible/non-module rÃƒÂ©-ÃƒÂ©value au rendu suivant. (2) Persistance du dernier module sur TOUT changement de module dÃƒÂ©terminÃƒÂ© par la route (lien direct/URL, plus seulement le sÃƒÂ©lecteur), AVEC exception pathname === \'/\' pour ne pas ÃƒÂ©craser le vrai dernier module avant que la reprise l\'ait lu. Invariant du verrou de navigation prÃƒÂ©servÃƒÂ© : liens/signets/F5 sur une adresse de module maintiennent l\'adresse exacte ; aucune reprise sur une route prÃƒÂ©fixÃƒÂ©e par un module. tsc --noEmit OK, build OK.',
    changes: [
      'contexts/ModuleSwitcherContext.tsx : reprise ÃƒÂ©ligible sur \'/\' + \'/dashboard\', timing one-shot, persistance du dernier module par tout moyen (sauf \'/\')',
      'constants/appVersion.ts + package.json : version 3.46.11 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.10',
    date: '2026-06-10',
    description: 'feat(gestion-eau) : releveur peut ÃƒÂ©diter/supprimer un relevÃƒÂ© de bassin sur la fenÃƒÂªtre 48 h glissantes. Le panneau dÃƒÂ©pliable Ã‚Â« RelevÃƒÂ©s rÃƒÂ©cents Ã‚Â» (EauSaisieBassinPage, onglet Niveau) Ã¢â‚¬â€ jusqu\'ici `roles.admin` only Ã¢â‚¬â€ s\'ouvre au releveur (additif, conditionnÃƒÂ© par rÃƒÂ´le). (1) Frontend : chargement de la liste pour admin OU releveur ; pour un releveur PUR (`roles.releveur && !roles.admin`), liste filtrÃƒÂ©e aux relevÃƒÂ©s Ã¢â€°Â¤ 48 h (visibleReleves), libellÃƒÂ© Ã‚Â« RelevÃƒÂ©s rÃƒÂ©cents Ã¢â‚¬â€ modifiables 48 h Ã‚Â», aide expliquant la limite, garde-fou 48 h dans saveEdit (toast) + bornes min/max sur l\'input datetime-local, bouton Ã‚Â« Recalculer tous les bilans Ã‚Â» masquÃƒÂ© (admin only). Admin inchangÃƒÂ© (liste complÃƒÂ¨te, sans limite). Services non modifiÃƒÂ©s (role-agnostiques). (2) RLS : 4 policies remplacÃƒÂ©es (idempotent) Ã¢â‚¬â€ eau_rb_upd/eau_rb_del (eau_releves_bassin) et eau_bil_upd/eau_bil_del (eau_bilans) autorisent admin (tout) OU releveur (using+with check timestamp >= now() - interval 48 heures), pour que le recalcul des bilans voisins dÃƒÂ©clenchÃƒÂ© par l\'ÃƒÂ©dition Ã¢â€°Â¤ 48 h n\'ÃƒÂ©choue pas en 401. Aucune donnÃƒÂ©e/colonne modifiÃƒÂ©e. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauSaisieBassinPage.tsx : panneau relevÃƒÂ©s ouvert au releveur, fenÃƒÂªtre 48 h (UI + garde-fou)',
      'RLS Supabase : eau_rb_upd/eau_rb_del/eau_bil_upd/eau_bil_del Ã¢â‚¬â€ branche releveur Ã¢â€°Â¤ 48 h',
      'constants/appVersion.ts + package.json : version 3.46.10 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.9',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : Phase 4 Ãƒâ€°LECTRICITÃƒâ€° Ã¢â‚¬â€ finitions & pilotage. (1) Tableau de bord : carte KPI Ã‚Â« Conso ÃƒÂ©lectrique Ã‚Â» (icÃƒÂ´ne Zap, tone gold) = somme par compteur de la derniÃƒÂ¨re conso d\'intervalle exploitable (kWh), via getElecKpiData() (eauElecReleveService, lecture Dexie offline-first, ÃƒÂ©tat vide propre si 0 relevÃƒÂ© / Ã‚Â« 2Ã¡Âµâ€° relevÃƒÂ© attendu Ã‚Â» si pas encore de conso) ; carte cliquable Ã¢â€ â€™ /gestion-eau/releves?tab=elec (navigate interne). (2) Cas limite blindÃƒÂ© : evaluerReleveElec ne signale plus Ã‚Â« aberrant bas Ã‚Â» quand conso === 0 (index identique = absence d\'usage lÃƒÂ©gitime). (3) Doc FONCTIONNEMENT-MODULES.md : sous-systÃƒÂ¨me ÃƒÂ©lectricitÃƒÂ© (relevÃƒÂ©s kWh, coÃƒÂ»ts A/B/CÃ¢â€ â€™D, facture combinÃƒÂ©e, PDF, matrice d\'accÃƒÂ¨s). Aides ÃƒÂ©lec (elecReleves/elecCouts/factureCombinee), logo PDF dÃƒÂ©gradant, skip villa sans relevÃƒÂ©, exclusion rupture, ÃƒÂ©tat vide client : dÃƒÂ©jÃƒÂ  en place (Phases 1-3), vÃƒÂ©rifiÃƒÂ©s. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/services/eauElecReleveService.ts : getElecKpiData() + garde conso 0 non aberrante',
      'modules/gestion-eau/components/EauDashboard.tsx : carte KPI Ã‚Â« Conso ÃƒÂ©lectrique Ã‚Â» (Zap) cliquable',
      'FONCTIONNEMENT-MODULES.md : sous-systÃƒÂ¨me ÃƒÂ©lectricitÃƒÂ© + matrice d\'accÃƒÂ¨s',
      'constants/appVersion.ts + package.json : version 3.46.9 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.8',
    date: '2026-06-09',
    description: 'fix(gestion-eau) : PDF facture combinÃƒÂ©e Ã¢â‚¬â€ alignement ÃƒÂ  droite. Les caractÃƒÂ¨res absents de la police Helvetica (espace fine insÃƒÂ©cable U+202F des sÃƒÂ©parateurs de milliers fr-FR, et la flÃƒÂ¨che Ã‚Â« Ã¢â€ â€™ Ã‚Â» de la pÃƒÂ©riode) faussaient le calcul de largeur de jsPDF Ã¢â€ â€™ le texte alignÃƒÂ© ÃƒÂ  droite (bandeau TOTAL Ã‚Â« 575 055 MGA Ã‚Â», ligne PÃƒÂ©riode) dÃƒÂ©bordait et ÃƒÂ©tait tronquÃƒÂ© au bord droit. Fix : helper pdfSafe() normalise U+202F/U+00A0 en espace normale dans fmtNb/fmtAr et sur le total du bandeau ; Ã‚Â« Ã¢â€ â€™ Ã‚Â» remplacÃƒÂ© par Ã‚Â« au Ã‚Â» dans la pÃƒÂ©riode. Aucun chevauchement, aucune troncature. ValidÃƒÂ© navigateur (PDF lu). tsc OK, build OK.',
    changes: [
      'modules/gestion-eau/utils/pdf.ts : pdfSafe() (normalise espaces fines) + pÃƒÂ©riode Ã‚Â« au Ã‚Â»',
      'constants/appVersion.ts + package.json : version 3.46.8 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.7',
    date: '2026-06-09',
    description: 'fix(gestion-eau) : finition PDF facture combinÃƒÂ©e. (1) Logo AHUVI dÃƒÂ©ployÃƒÂ© Ã¢â‚¬â€ frontend/public/ahuvi-logo.png (800Ãƒâ€”268, gitignored) ajoutÃƒÂ© via git add -f ; sans cela /ahuvi-logo.png renvoyait le HTML de repli SPA Ã¢â€ â€™ buildFactureCombineePdf basculait sur le titre texte. (2) Chevauchement P.U./Total des tableaux sur les gros montants corrigÃƒÂ© : devise dÃƒÂ©placÃƒÂ©e dans l\'en-tÃƒÂªte des colonnes (Ã‚Â« P.U. (MGA) Ã‚Â» / Ã‚Â« Total (MGA) Ã‚Â»), cellules P.U./Total en nombre nu (fmtNb), largeurs rÃƒÂ©ÃƒÂ©quilibrÃƒÂ©es (40/24/24/26/28/32=174). (3) EncadrÃƒÂ© A/B/C/D rÃƒÂ©ÃƒÂ©crit en 4 lignes empilÃƒÂ©es pleine largeur (plus de tÃƒÂ©lescopage avec la colonne C). ValidÃƒÂ© navigateur : AperÃƒÂ§u live V04 eau 145 500 + ÃƒÂ©lec 429 555 = total 575 055, PDF lu (2 tableaux + encadrÃƒÂ© + Ã‚Â« Soit Cinq cent soixante-quinze mille cinquante-cinq Ariary Ã‚Â»). tsc OK, build OK.',
    changes: [
      'modules/gestion-eau/utils/pdf.ts : colonnes devise en-tÃƒÂªte + fmtNb cellules + encadrÃƒÂ© A/B/C/D 4 lignes',
      'frontend/public/ahuvi-logo.png : dÃƒÂ©ployÃƒÂ© (git add -f)',
      'constants/appVersion.ts + package.json : version 3.46.7 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.6',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : Phase 3 Ãƒâ€°LECTRICITÃƒâ€° Ã¢â‚¬â€ facture COMBINÃƒâ€°E eau + ÃƒÂ©lectricitÃƒÂ© + PDF modernisÃƒÂ©. utils/facture.ts : computeLigneElec (miroir computeLigneFacture en kWh Ãƒâ€” prixKwh, null si pas de relevÃƒÂ©/rupture). eauFactureService : FacturePreview ÃƒÂ©tendu (indexDebutElec/indexFinElec/consoKwh/montantElec/montantTotal) ; previewFactures(start,end,coutMois) et genererFactures(start,end,{coutMois,dateEcheanceIso}) calculent la ligne ÃƒÂ©lec via prix_kwh du mois choisi (getCoutByMois) et persistent index_debut_elec/index_fin_elec/conso_kwh/prix_kwh/montant_elec/cout_mois/montant_total ; skip seulement si NI eau NI ÃƒÂ©lec ; idempotence/numÃƒÂ©rotation inchangÃƒÂ©es. utils/montantLettres.ts (neuf, pur, 0Ã¢â€ â€™milliards, rÃƒÂ¨gles et/cents/mille) : montantEnLettres(575055)=Ã‚Â« Cinq cent soixante-quinze mille cinquante-cinq Ariary Ã‚Â». utils/pdf.ts : buildFactureCombineePdf/downloadFactureCombineePdf Ã¢â‚¬â€ logo AHUVI (/ahuvi-logo.png fetchÃ¢â€ â€™dataURL, ratio respectÃƒÂ©, repli texte si absent), en-tÃƒÂªte propriÃƒÂ©taire+villa (V04Ã¢â€ â€™VILLA NÃ‚Â°4), tableau Ãƒâ€°LECTRICITÃƒâ€° + tableau EAU, encadrÃƒÂ© A/B/C/D (transparence prix kWh), grand total sky-700 + Ã‚Â« Soit Ã¢â‚¬Â¦ Ariary Ã‚Â» ; dÃƒÂ©gradation eau-seule/ÃƒÂ©lec-seule. EauFacturationPage : sÃƒÂ©lecteur Ã‚Â« Mois de coÃƒÂ»ts ÃƒÂ©lec Ã‚Â» + garde-fou lien interne /gestion-eau/elec-couts, colonnes eau/ÃƒÂ©lec/total (aperÃƒÂ§u+liste), EauAide factureCombinee. EauClientPage : PDF combinÃƒÂ©. tsc OK, build OK.',
    changes: [
      'modules/gestion-eau/utils/facture.ts : computeLigneElec (kWh)',
      'modules/gestion-eau/services/eauFactureService.ts : preview/generer combinÃƒÂ©s (coutMois)',
      'modules/gestion-eau/utils/montantLettres.ts (neuf) : montant en toutes lettres',
      'modules/gestion-eau/utils/pdf.ts : buildFactureCombineePdf/downloadFactureCombineePdf',
      'modules/gestion-eau/components/EauFacturationPage.tsx : sÃƒÂ©lecteur mois coÃƒÂ»ts + colonnes eau/ÃƒÂ©lec/total + PDF combinÃƒÂ©',
      'modules/gestion-eau/components/EauClientPage.tsx : PDF combinÃƒÂ©',
      'modules/gestion-eau/components/eauAideTextes.ts : aide factureCombinee',
      'constants/appVersion.ts + package.json : version 3.46.6 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.5',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : Phase 2 Ãƒâ€°LECTRICITÃƒâ€° Ã¢â‚¬â€ saisie & suivi des relevÃƒÂ©s de compteur ÃƒÂ©lectrique (kWh). Service eauElecReleveService complÃƒÂ©tÃƒÂ© (miroir compteur eau sur eau_elec_releves_compteur) : evaluerReleveElec (rupture index< + conso=max(0,ÃŽâ€) + detectAberrant via moyenne(historiqueConsoElec)+facteurAberrantFromConfig), historiqueConsoElec (deltas>0, saute rupture), addReleveElec (saveLocal upsert idempotent id client + agent_id getCurrentUserIdSync + created_at), updateReleveElec/deleteReleveElec (admin). Nouvel ÃƒÂ©cran EauSaisieElecPage (copie adaptÃƒÂ©e de EauSaisieCompteurPage, kWh + icÃƒÂ´ne Zap, ton or AHUVI) branchÃƒÂ© en sous-onglet Ã‚Â« Ãƒâ€°lectricitÃƒÂ© Ã‚Â» (?tab=elec) de EauRelevesPage via EauTabs Ã¢â‚¬â€ mÃƒÂªmes compteurs que l\'eau (listCompteursActifs), dernier index, conso instantanÃƒÂ©e, confirmations rupture/aberrant (showConfirm), photo optionnelle, historique + BarChart 12 derniers (isAnimationActive=false). Ãƒâ€°criture dÃƒÂ©sactivÃƒÂ©e si isReadOnly (promoteur) ; accÃƒÂ¨s admin+releveur via la garde de route existante de RelevÃƒÂ©s. Espace propriÃƒÂ©taire EauClientPage (Ã‚Â« Ma conso Ã‚Â») : section Ãƒâ€°lectricitÃƒÂ© lecture seule par compteur (dernier index kWh + mini-BarChart conso, dÃƒÂ©gradation propre si aucun relevÃƒÂ©). Helper fmtKwh + aide elecReleves. tsc OK, build OK.',
    changes: [
      'modules/gestion-eau/services/eauElecReleveService.ts : evaluer/historique/add/update/delete + lectures',
      'modules/gestion-eau/components/EauSaisieElecPage.tsx (neuf) : saisie ÃƒÂ©lec kWh (miroir compteur eau)',
      'modules/gestion-eau/components/EauRelevesPage.tsx : sous-onglet Ã‚Â« Ãƒâ€°lectricitÃƒÂ© Ã‚Â» (?tab=elec)',
      'modules/gestion-eau/components/EauClientPage.tsx : section Ãƒâ€°lectricitÃƒÂ© lecture seule (Ã‚Â« Ma conso Ã‚Â»)',
      'modules/gestion-eau/utils/format.ts : helper fmtKwh',
      'modules/gestion-eau/components/eauAideTextes.ts : aide elecReleves',
      'constants/appVersion.ts + package.json : version 3.46.5 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.4',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : socle Ãƒâ€°LECTRICITÃƒâ€° (Phase 1 de la facture combinÃƒÂ©e eau+ÃƒÂ©lec) + ÃƒÂ©cran admin Ã‚Â« CoÃƒÂ»ts ÃƒÂ©lectricitÃƒÂ© du mois Ã‚Â». SQL (idempotent, RLS to public + helpers eau_is_admin/eau_is_releveur) : 2 tables eau_elec_releves_compteur (kWh, miroir relevÃƒÂ©s eau) et eau_elec_couts (mois unique, total_jirama/gasoil/kwh Ã¢â€ â€™ prix_kwh) ; 7 colonnes ÃƒÂ©lec additives sur eau_factures (index_debut_elec/index_fin_elec/conso_kwh/prix_kwh/montant_elec/cout_mois/montant_total). Types ElecReleveRow/Local + ElecCoutRow/Local + extension FactureRow/Local. Dexie v6 (2 stores additifs) + EAU_TABLES + PK_BY_TABLE. Services eauElecCoutService (list/getByMois/getById/upsert idempotent par mois calculant prix_kwh/refresh/delete) + eauElecReleveService (lectures, squelette Phase 2). Ãƒâ€°cran EauElecCoutsPage (route /gestion-eau/elec-couts, garde admin/releveur/promoteur ; ÃƒÂ©criture admin only, isReadOnly Ã¢â€ â€™ lecture seule) : liste mois + formulaire A/B/C Ã¢â€ â€™ D=(A+B)/C en direct, garde-fou C>0, aide dÃƒÂ©pliable. EntrÃƒÂ©e menu HeaderEauActions Ã‚Â« CoÃƒÂ»ts ÃƒÂ©lectricitÃƒÂ© Ã‚Â» (icÃƒÂ´ne Zap). tsc OK, build OK.',
    changes: [
      'modules/gestion-eau/types/gestionEau.ts : ElecReleveRow/Local, ElecCoutRow/Local, +7 colonnes ÃƒÂ©lec FactureRow/Local',
      'modules/gestion-eau/db/gestionEauDb.ts : tables ÃƒÂ©lec + version(6) + EAU_TABLES',
      'modules/gestion-eau/services/eauSync.ts : PK_BY_TABLE (2 entrÃƒÂ©es ÃƒÂ©lec)',
      'modules/gestion-eau/services/eauElecCoutService.ts (neuf) + eauElecReleveService.ts (neuf)',
      'modules/gestion-eau/components/EauElecCoutsPage.tsx (neuf) + route GestionEauRoutes.tsx',
      'components/Layout/header/HeaderEauActions.tsx : entrÃƒÂ©e Ã‚Â« CoÃƒÂ»ts ÃƒÂ©lectricitÃƒÂ© Ã‚Â» (Zap)',
      'modules/gestion-eau/components/eauAideTextes.ts : aide elecCouts',
      'SQL Supabase : 2 tables + RLS (4+4 policies) + 7 colonnes eau_factures',
      'constants/appVersion.ts + package.json : version 3.46.4 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.3',
    date: '2026-06-09',
    description: 'fix(gestion-eau) : le lien Ã‚Â« Aller ÃƒÂ  la configuration Ã‚Â» du panneau Ã‚Â« Configurer d\'abord Ã‚Â» (EauFacturationPage) faisait une navigation navigateur brute via <a href="/gestion-eau/config"> Ã¢â€ â€™ rechargement complet du document Ã¢â€ â€™ dÃƒÂ©marrage ÃƒÂ  froid Ã¢â€ â€™ rÃƒÂ´le admin non encore rÃƒÂ©solu (DB timeout 5s) Ã¢â€ â€™ la garde de route admin rebondit. Correctif alignÃƒÂ© sur le patron dÃƒÂ©jÃƒÂ  en place (EauSaisieBassinPage) : useNavigate de react-router-dom + <button onClick={() => navigate(\'/gestion-eau/config\')}> (navigation SPA interne, sans rechargement). Classes, icÃƒÂ´ne Settings et libellÃƒÂ© conservÃƒÂ©s ÃƒÂ  l\'identique. 1 seul fichier touchÃƒÂ© ; aucune logique de complÃƒÂ©tude, garde de route ou autre lien modifiÃƒÂ©. tsc OK, build OK. Cause profonde (rebond des accÃƒÂ¨s directs/F5 sur ÃƒÂ©crans admin eau au boot) hors pÃƒÂ©rimÃƒÂ¨tre.',
    changes: [
      'modules/gestion-eau/components/EauFacturationPage.tsx : import useNavigate + const navigate ; <a href> Ã¢â€ â€™ <button onClick navigate>',
      'constants/appVersion.ts + package.json : version 3.46.3 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.2',
    date: '2026-06-09',
    description: 'chore(gestion-eau) : renomme les LIBELLÃƒâ€°S AFFICHÃƒâ€°S Ã‚Â« Client Ã‚Â» Ã¢â€ â€™ Ã‚Â« PropriÃƒÂ©taire Ã‚Â» (UI uniquement, aucun SQL). Seules les chaÃƒÂ®nes visibles ÃƒÂ  l\'ÃƒÂ©cran sont changÃƒÂ©es : case du rÃƒÂ´le dans le formulaire d\'invitation + de validation de demande, badges, EauUtilisateursPage (sous-titre Ã‚Â« comptes propriÃƒÂ©taires Ã‚Â», bouton/titre Ã‚Â« Compte propriÃƒÂ©taire Ã‚Â», Ã‚Â« Comptes propriÃƒÂ©taires Ã‚Â», Ã‚Â« Aucun compte propriÃƒÂ©taire. Ã‚Â», Ã‚Â« Transmettez ce code au propriÃƒÂ©taire Ã‚Â»), invitationRolesLabel (PropriÃƒÂ©taire), messages scan (EauQrScanner Ã‚Â« compte propriÃƒÂ©taire Ã‚Â», EauRelevesPage Ã‚Â« QR d\'un propriÃƒÂ©taire Ã‚Â», EauScanResolverPage Ã‚Â« QR propriÃƒÂ©taire Ã‚Â»), journal EauAuditPage (Ã‚Â« Fiche propriÃƒÂ©taire Ã‚Â», Ã‚Â« Espace propriÃƒÂ©taire Ã‚Â», Ã‚Â« PropriÃƒÂ©taire Ã‚Â»), EauClientQrPage (Ã‚Â« Aucun compte propriÃƒÂ©taire associÃƒÂ© Ã‚Â», alt Ã‚Â« Mon QR propriÃƒÂ©taire Ã‚Â»), EauClientPage (sous-titre Ã‚Â« Espace propriÃƒÂ©taire Ã‚Â»), eauDemandeService (nom par dÃƒÂ©faut Ã‚Â« PropriÃƒÂ©taire Ã‚Â»), textes d\'aide eauAideTextes. AUCUN identifiant technique touchÃƒÂ© (rÃƒÂ´le interne `client`, `role_client`, routes `/gestion-eau/client`, table `eau_comptes_client`, types/services/variables, assertions de tests, clÃƒÂ©s localStorage = INTACTS). Aucune rÃƒÂ©gression fonctionnelle : routes, rÃƒÂ´les, RLS inchangÃƒÂ©s. tsc OK, build OK, suite eau verte (hors eauNavRoles + eauPhase4 = ÃƒÂ©checs prÃƒÂ©-existants).',
    changes: [
      'modules/gestion-eau/components/eauAideTextes.ts : Ã‚Â« client Ã‚Â» Ã¢â€ â€™ Ã‚Â« propriÃƒÂ©taire Ã‚Â» (3 textes d\'aide)',
      'modules/gestion-eau/components/EauUtilisateursPage.tsx : 6 libellÃƒÂ©s (sous-titre, bouton, titres, vides, code)',
      'modules/gestion-eau/components/EauDemandesPage.tsx : badge + case rÃƒÂ´le + toast + 2 Ã‚Â« Compteurs visibles (propriÃƒÂ©taire) Ã‚Â»',
      'modules/gestion-eau/components/EauAuditPage.tsx : labels journal (Fiche/Espace/PropriÃƒÂ©taire)',
      'modules/gestion-eau/components/EauClientQrPage.tsx + EauClientPage.tsx + EauQrScanner.tsx + EauRelevesPage.tsx + EauScanResolverPage.tsx : messages affichÃƒÂ©s',
      'modules/gestion-eau/services/eauInvitationService.ts (invitationRolesLabel) + eauDemandeService.ts (nom par dÃƒÂ©faut)',
      'constants/appVersion.ts + package.json : version 3.46.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.1',
    date: '2026-06-09',
    description: 'fix(gestion-eau) : computeBilan plafonne l\'apport par dÃƒÂ©bit ÃƒÂ  la pompe intermittente (FRACTION_POMPE). Suite/complÃƒÂ©ment de v3.45.2 (qui corrigeait l\'AFFICHAGE estimÃƒÂ© via consoEstimee.ts mais laissait computeBilan, donc les BILANS PERSISTÃƒâ€°S, Ã‚Â« Conso rÃƒÂ©seau (pÃƒÂ©riode) Ã‚Â», pertes/NRW et anomalies en dÃƒÂ©bitÃƒâ€”ÃŽâ€t Ã¢â€ â€™ surestimÃƒÂ©s). DÃƒÂ©cision JOEL (questions fermÃƒÂ©es) : 1=corriger aussi le moteur ; facturation = compteurs uniquement (aucun impact montants). Changement : dans computeBilan, la branche apport par dÃƒÂ©bit devient apport = dÃƒÂ©bit Ãƒâ€” ÃŽâ€t Ãƒâ€” FRACTION_POMPE (la pompe se coupe au flotteur, pas de marche continue). FRACTION_POMPE (0,5) dÃƒÂ©placÃƒÂ©e comme constante CANONIQUE dans utils/bilan.ts, rÃƒÂ©-exportÃƒÂ©e par utils/projection.ts (importateurs inchangÃƒÂ©s). N\'impacte PAS override/entrÃƒÂ©es manuelles. Effet : Ã‚Â« Conso rÃƒÂ©seau (pÃƒÂ©riode) Ã‚Â» et pertes baissent vers le rÃƒÂ©aliste, fausses anomalies (apport gonflÃƒÂ© Ã¢â€ â€™ stock attendu trop haut) en moins. Les bilans DÃƒâ€°JÃƒâ‚¬ enregistrÃƒÂ©s gardent leurs valeurs jusqu\'ÃƒÂ  Ã‚Â« Recalculer tous les bilans Ã‚Â» (admin) ; les nouveaux sont corrects d\'emblÃƒÂ©e. consoEstimee.ts (affichage estimÃƒÂ©) NON concernÃƒÂ© Ã¢â€ â€™ pas de double comptage. Tests computeBilan/dÃƒÂ©bit adaptÃƒÂ©s (ÃŽâ€t 2h Ãƒâ€” 0,5 = valeurs inchangÃƒÂ©es) + 1 test FRACTION_POMPE. tsc OK, build OK, suite eau verte (hors eauNavRoles = ÃƒÂ©chec prÃƒÂ©-existant v3.46.0, et eauPhase4 environnemental).',
    changes: [
      'PARTAGÃƒâ€° modules/gestion-eau/utils/bilan.ts : FRACTION_POMPE canonique + apport dÃƒÂ©bit Ãƒâ€”FRACTION_POMPE dans computeBilan',
      'modules/gestion-eau/utils/projection.ts : rÃƒÂ©-export FRACTION_POMPE depuis bilan.ts',
      'modules/gestion-eau/__tests__/eauBassinDebit.test.ts : ÃŽâ€t 2h (compense Ãƒâ€”0,5) + test FRACTION_POMPE',
      'constants/appVersion.ts + package.json : version 3.46.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.46.0',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : vue Ã‚Â« Situation du bassin Ã‚Â» en LECTURE SEULE pour le propriÃƒÂ©taire (rÃƒÂ´le technique client) + ouverture RLS de la lecture bassin. SQL (exÃƒÂ©cutÃƒÂ© + vÃƒÂ©rifiÃƒÂ© via ÃƒÂ©diteur Supabase, RÃƒË†GLE #0ter) : helper eau_is_client() (security definer, a un eau_comptes_client actif) + 5 policies SELECT additives _sel_client (to public using eau_is_client()) sur eau_releves_bassin/eau_entrees_bassin/eau_bilans/eau_debit_tests/eau_config Ã¢â‚¬â€ combinÃƒÂ©es en OR avec l\'existant, aucune policy d\'ÃƒÂ©criture pour le client. VÃƒÂ©rif ROLLBACK (set role authenticated + impersonation) : propriÃƒÂ©taire voit le bassin (33 relevÃƒÂ©s), config=1, bilans=9 ; AUCUNE policy d\'ÃƒÂ©criture ne rÃƒÂ©fÃƒÂ©rence eau_is_client (0) et une ÃƒÂ©criture authenticated non-admin/releveur est BLOCKED ; non-rÃƒÂ©gression : un non-client Ã¢â€ â€™ eau_is_client()=false. Frontend additif : nouvel onglet Ã‚Â« Le bassin Ã‚Â» dans l\'espace propriÃƒÂ©taire (EauClientPage, route client/bassin) Ã¢â€ â€™ EauProprietaireBassinPage rÃƒÂ©utilise getDashboardData() + getTendances() (niveau, % remplissage, autonomie, conso estimÃƒÂ©e + courbe niveau 30 j, isAnimationActive=false) ; nav GESTION_EAU_NAV_ITEMS += Ã‚Â« Le bassin Ã‚Â» (icÃƒÂ´ne Waves) ; aide repliable proprietaireBassin. 100 % lecture seule. tsc OK, build OK.',
    changes: [
      'SQL : eau_is_client() + 5 policies _sel_client (lecture bassin propriÃƒÂ©taire), vÃƒÂ©rif rollback OK',
      'PARTAGÃƒâ€° constants/index.ts : GESTION_EAU_NAV_ITEMS += /client/bassin (icÃƒÂ´ne Waves, rÃƒÂ´le client)',
      'PARTAGÃƒâ€° Navigation/BottomNav.tsx + Layout/Header.tsx : icÃƒÂ´ne Waves ajoutÃƒÂ©e aux maps eau',
      'PARTAGÃƒâ€° components/EauClientPage.tsx : onglet Ã‚Â« Le bassin Ã‚Â» (tab bassin) + titre/aide conditionnels',
      'Nouveau components/EauProprietaireBassinPage.tsx : KPI bassin + courbe niveau (rÃƒÂ©utilise getDashboardData/getTendances)',
      'components/eauAideTextes.ts : aide proprietaireBassin',
      'constants/appVersion.ts + package.json : version 3.46.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.45.2',
    date: '2026-06-09',
    description: 'fix(gestion-eau) : conso estimÃƒÂ©e rÃƒÂ©aliste Ã¢â‚¬â€ ancrÃƒÂ©e sur le rythme observÃƒÂ© au vidage (pompe intermittente). ValidÃƒÂ© chiffrÃƒÂ© en prod : la conso estimÃƒÂ©e (et la projection anti-zÃƒÂ©ro qui en hÃƒÂ©rite) surestimait massivement (tendance ~81,5 mÃ‚Â³/j vs rÃƒÂ©el ~18,8 mÃ‚Â³/j ; sÃƒÂ©rie 50Ã¢â‚¬â€œ138 mÃ‚Â³/j). Cause : apport = dÃƒÂ©bitÃƒâ€”ÃŽâ€t suppose la pompe en marche continue, or elle est intermittente Ã¢â€ â€™ sur tout intervalle oÃƒÂ¹ le bassin NE MONTE PAS, dÃƒÂ©bitÃƒâ€”ÃŽâ€t surestime. (NB : la 1ÃŠÂ³Ã¡Âµâ€° approche Ã‚Â« plafonner seulement les intervalles finissant au flotteur Ã‚Â» testÃƒÂ©e en donnÃƒÂ©es live laissait consoBaseÃ¢â€°Ë†5 mÃ‚Â³/h Ã¢â€ â€™ tendance 70,85, insuffisant ; corrigÃƒÂ©e vers l\'ancrage sur le vidage.) Nouveau helper PUR utils/consoEstimee.ts (calculerConsoEstimee + consoBaseM3hOf, 9 tests) : conso DIRECTEMENT OBSERVABLE uniquement sur les intervalles de VIDAGE (niveau baisse, pompe ÃƒÂ  l\'arrÃƒÂªt Ã¢â€ â€™ conso = Ã¢Ë†â€™ÃŽâ€stock) ; intervalles MONTANTS/PLATS (conso masquÃƒÂ©e par le remplissage) estimÃƒÂ©s par consoBaseÃƒâ€”ÃŽâ€t ; entrÃƒÂ©e manuelle = bilan direct max(0, entrÃƒÂ©eÃ¢Ë†â€™ÃŽâ€stock). consoBase (mÃ‚Â³/h) = moyenne du rythme des vidages (anti-circularitÃƒÂ©, aucune hypothÃƒÂ¨se de pompe) ; replis estimerAutonomie.consoMoyenneHeureM3 Ã¢â€ â€™ dÃƒÂ©bitÃƒâ€”FRACTION_POMPE(0,5) Ã¢â€ â€™ 0. Net de pertes = Ãƒâ€”(1Ã¢Ë†â€™0,30). RÃƒÂ©sultat live : consoBase 1,66 mÃ‚Â³/h, sÃƒÂ©rie ~11Ã¢â‚¬â€œ40 mÃ‚Â³/j, tendance 22,5 mÃ‚Â³/j (interval B 186Ã¢â€ â€™245 = 35 mÃ‚Â³ au lieu de 95). eauTendanceService + eauBilanService rebranchÃƒÂ©s (SOURCE UNIQUE) ; bucket jour LOCAL (bucketByLocalDay). computeBilan/bilans persistÃƒÂ©s/NRW/Conso rÃƒÂ©seau pÃƒÂ©riode INCHANGÃƒâ€°S. tsc OK, build OK, 107 tests eau verts.',
    changes: [
      'NOUVEAU modules/gestion-eau/utils/consoEstimee.ts : calculerConsoEstimee + consoBaseM3hOf (pur, ancrage vidage)',
      'modules/gestion-eau/services/eauTendanceService.ts : sÃƒÂ©rie estimÃƒÂ©e via calculerConsoEstimee + bucketByLocalDay (export)',
      'modules/gestion-eau/services/eauBilanService.ts : conso du jour via calculerConsoEstimee + jour local',
      'modules/gestion-eau/components/eauAideTextes.ts : aide tendancesConsoEstimee (coupures de pompe)',
      'NOUVEAU modules/gestion-eau/__tests__/eauConsoEstimee.test.ts : 9 tests',
      'constants/appVersion.ts + package.json : version 3.45.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.45.0',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : rÃƒÂ´le PROMOTEUR dans le flux d\'invitation & de demande Ã¢â‚¬â€ Phase 3 (SQL + frontend). SQL (exÃƒÂ©cutÃƒÂ© + vÃƒÂ©rifiÃƒÂ© via ÃƒÂ©diteur Supabase, RÃƒË†GLE #0ter) : colonne eau_invitations.role_promoteur (REST 200) ; les 2 RPC SECURITY DEFINER eau_claim_invitation() et eau_claim_invitation_by_token(p_token) octroient dÃƒÂ©sormais promoteur dans eau_roles (insert + on-conflict), patchÃƒÂ©es via pg_get_functiondef + regexp_replace + garde anti-erreur (idempotent). VÃƒÂ©rif ROLLBACK (impersonation JWT) : invitation role_promoteur=true Ã¢â€ â€™ claim Ã¢â€ â€™ eau_roles.promoteur=true, admin/releveur=false, invitation acceptee, 2e claim NULL (idempotent), aucun compte client crÃƒÂ©ÃƒÂ©. Frontend additif : InvitationRow += role_promoteur ; eauInvitationService (InvitationInput/WhatsappInvitationInput/createInvitation/createWhatsappInvitation/RoleFlags/invitationRoleLabel += Promoteur, invitationTargetPath promoteurÃ¢â€ â€™/gestion-eau) ; eauDemandeService.validerDemande octroie promoteur ; EauDemandesPage : case Promoteur (email + WhatsApp), badge Promoteur, validation d\'une demande avec Promoteur. Lecture seule (Phase 2) inchangÃƒÂ©e : un promoteur ne crÃƒÂ©e pas d\'invitation ni ne valide une demande. tsc OK, build OK.',
    changes: [
      'SQL : eau_invitations.role_promoteur + eau_claim_invitation()/eau_claim_invitation_by_token() octroient promoteur (vÃƒÂ©rif rollback OK)',
      'PARTAGÃƒâ€° types/gestionEau.ts : InvitationRow += role_promoteur',
      'PARTAGÃƒâ€° services/eauInvitationService.ts : payloads + RoleFlags + invitationRoleLabel + invitationTargetPath gÃƒÂ¨rent promoteur',
      'PARTAGÃƒâ€° services/eauDemandeService.ts : ValidationInput + validerDemande octroient promoteur',
      'PARTAGÃƒâ€° components/EauDemandesPage.tsx : case Promoteur (invitation email/WhatsApp + validation demande) + badge',
      'constants/appVersion.ts + package.json : version 3.45.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.44.2',
    date: '2026-06-09',
    description: 'fix(gestion-eau) : la projection (pointillÃƒÂ©s) des Tendances se base sur le jour LOCAL et non UTC. DÃƒÂ©couvert en validation live (02:08 Madagascar = 23:08 UTC) : getTendances bornait Ã‚Â« aujourd\'hui Ã‚Â» via toISOString (UTC), donc dans les 3 premiÃƒÂ¨res heures locales le dernier jour estimÃƒÂ© ÃƒÂ©tait encore Ã‚Â« aujourd\'hui Ã‚Â» en UTC Ã¢â€ â€™ consoProjeteeParJour vide, aProjection=false, pas de segment pointillÃƒÂ© (alors que le tableau de bord, qui borne le jour en local, projetait bien). Nouveau helper localDayLabel ; boucle de projection remontÃƒÂ©e depuis le jour local, comblant du dernier jour estimÃƒÂ© (exclu) ÃƒÂ  aujourd\'hui (inclus). CohÃƒÂ©rent avec EauDashboard. tsc OK, build OK, 7 tests projection verts.',
    changes: [
      'modules/gestion-eau/services/eauTendanceService.ts : localDayLabel + projection sur jour local',
      'constants/appVersion.ts + package.json : version 3.44.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.44.1',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : conso du jour jamais 0 par absence de relevÃƒÂ© (projection tendance + pertes rÃƒÂ©seau). Bug : Ã‚Â« Conso du jour Ã‚Â» (dashboard) et la courbe Ã‚Â« Consommation par jour Ã‚Â» (Tendances) retombaient ÃƒÂ  0 les jours sans relevÃƒÂ© de niveau, car la conso estimÃƒÂ©e ne bouclait que sur les relevÃƒÂ©s du jour (n=0 Ã¢â€ â€™ 0). RÃƒÂ¨gle mÃƒÂ©tier : une absence de relevÃƒÂ© n\'est PAS une conso nulle. Nouveau utils/projection.ts (pur, 7 tests) : projeterConsoJour() en cascade tendance3 Ã¢â€ â€™ moyenne Ã¢â€ â€™ dÃƒÂ©bit bornÃƒÂ© (Ãƒâ€” 24 Ãƒâ€” FRACTION_POMPE 0,5 Ãƒâ€” (1Ã¢Ë†â€™pertes), JAMAIS dÃƒÂ©bitÃƒâ€”24). Constante PERTE_RESEAU_DEFAUT_PCT=0,30 (NRW) dans utils/bilan.ts. getDashboardData() : anti-zÃƒÂ©ro (projection proratisÃƒÂ©e sur la fraction du jour ÃƒÂ©coulÃƒÂ©e) + champ consoJourSource (mesuree/estimee_intervalle/projection_*/zero_compteurs) ; carve-out 0 lÃƒÂ©gitime si compteurs rÃƒÂ©els ÃƒÂ  0 (aucune projection par-dessus une mesure). getTendances() : conso estimÃƒÂ©e NETTE des pertes + sÃƒÂ©rie consoProjeteeParJour comblant le trou jusqu\'ÃƒÂ  aujourd\'hui (pointillÃƒÂ©s) + projectionSource/aProjection. EauTendancesPage : 2Ã¡Âµâ€° aire pointillÃƒÂ©e Ã‚Â« projection (relevÃƒÂ©s en attente) Ã‚Â» + lÃƒÂ©gende. EauDashboard : mention selon la source (icÃƒÂ´ne TrendingUp si projection). Bascule auto sur le mÃƒÂ©trÃƒÂ© dÃƒÂ¨s 1 relevÃƒÂ© compteur. Additif strict, isAnimationActive={false} conservÃƒÂ©. tsc --noEmit OK, build OK, 98 tests eau verts.',
    changes: [
      'PARTAGÃƒâ€° modules/gestion-eau/utils/bilan.ts : constante PERTE_RESEAU_DEFAUT_PCT (0,30)',
      'NOUVEAU modules/gestion-eau/utils/projection.ts : projeterConsoJour + FRACTION_POMPE (pur)',
      'modules/gestion-eau/services/eauBilanService.ts : anti-zÃƒÂ©ro (projeterConsoJour) + ConsoJourSource + carve-out 0 compteurs + pertes dÃƒÂ©duites',
      'modules/gestion-eau/services/eauTendanceService.ts : pertes dÃƒÂ©duites + consoProjeteeParJour + projectionSource + aProjection',
      'modules/gestion-eau/components/EauTendancesPage.tsx : aire projection pointillÃƒÂ©e + lÃƒÂ©gende',
      'modules/gestion-eau/components/EauDashboard.tsx : mention conso du jour selon la source',
      'modules/gestion-eau/components/eauAideTextes.ts : aide tendancesConsoEstimee (projection + pertes)',
      'NOUVEAU modules/gestion-eau/__tests__/eauProjection.test.ts : 7 tests',
      'constants/appVersion.ts + package.json : version 3.44.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.44.0',
    date: '2026-06-09',
    description: 'feat(gestion-eau) : rÃƒÂ´le PROMOTEUR (lecture totale + seuils d\'alerte) Ã¢â‚¬â€ Phase 2 frontend. L\'admin attribue le rÃƒÂ´le via un toggle Ã‚Â« Promoteur Ã‚Â» dans Utilisateurs & rÃƒÂ´les (colonne eau_roles.promoteur, RLS Phase 1). Un promoteur Ã‚Â« pur Ã‚Â» (sans admin ni releveur) a accÃƒÂ¨s EN LECTURE ÃƒÂ  tous les ÃƒÂ©crans mÃƒÂ©tier (tableau de bord, relevÃƒÂ©s, suivi, compteurs, facturation incluant toutes les factures) ET aux ÃƒÂ©crans d\'administration (config, utilisateurs, demandes, alertes, annonces, audit) ; tous les contrÃƒÂ´les d\'ÃƒÂ©criture y sont masquÃƒÂ©s/dÃƒÂ©sactivÃƒÂ©s et chaque handler de mutation est gardÃƒÂ© (if isReadOnly return). Seule ÃƒÂ©criture autorisÃƒÂ©e : les 6 seuils d\'alerte de la Configuration, via la RPC SECURITY DEFINER eau_set_alert_thresholds (les autres champs config restent en lecture seule). isReadOnly = roles.promoteur && !admin && !releveur (un admin/releveur cumulant promoteur garde l\'ÃƒÂ©criture). Additif strict : admin/releveur/client inchangÃƒÂ©s. tsc --noEmit OK, build OK, 23 tests verts.',
    changes: [
      'PARTAGÃƒâ€° types/gestionEau.ts : EauRoles/EauRole/RoleRow += promoteur',
      'PARTAGÃƒâ€° services/eauRoleService.ts : getRolesForUser + setRoles gÃƒÂ¨rent promoteur',
      'PARTAGÃƒâ€° context/GestionEauContext.tsx : expose isReadOnly + hasEauAccess inclut promoteur',
      'PARTAGÃƒâ€° constants/index.ts : GESTION_EAU_NAV_ITEMS ouverts au promoteur (dashboard/relevÃƒÂ©s/suivi/compteurs/facturation)',
      'PARTAGÃƒâ€° Layout/header/HeaderEauActions.tsx : entrÃƒÂ©es admin visibles au promoteur',
      'GestionEauRoutes/EauRoleProtectedRoute : routes mÃƒÂ©tier + admin autorisÃƒÂ©es au promoteur (home Ã¢â€ â€™ tableau de bord)',
      'EauConfigPage : promoteur ÃƒÂ©dite seulement les seuils d\'alerte (RPC eau_set_alert_thresholds) ; reste en lecture seule',
      'EauUtilisateursPage : toggle Promoteur + lecture seule',
      'Nouveau components/EauReadOnly.tsx : EauReadOnlyBadge / EauReadOnlyBanner',
      'Lecture seule appliquÃƒÂ©e : EauSaisieBassinPage, EauSaisieCompteurPage, EauRelevesPage, EauTourneePage, EauCompteursPage, EauFacturationPage, EauDemandesPage, EauAnnoncesPage, EauAlertesPage, EauAnomaliesPage, EauQrCompteurManager',
      'tests : eauNavRoles (cas promoteur) + eauScanQr (EauRoles += promoteur)',
      'constants/appVersion.ts + package.json : version 3.44.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.43.2',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : consommation ESTIMÃƒâ€°E par le dÃƒÂ©bit des pompes (sans compteurs) + bascule auto vers le mÃƒÂ©trÃƒÂ©. Le graphique Ã‚Â« Consommation par jour Ã‚Â» (Tendances) et le chiffre Ã‚Â« consommation du jour Ã‚Â» (tableau de bord) ÃƒÂ©taient vides faute de relevÃƒÂ©s de compteurs (conso_m3). En attendant les compteurs, on expose une conso estimÃƒÂ©e dÃƒÂ©duite du dÃƒÂ©bit, calculÃƒÂ©e Ãƒâ‚¬ LA VOLÃƒâ€°E via computeBilan (formule unique, non modifiÃƒÂ©e) : consoReseauM3 = apport Ã¢Ë†â€™ ÃŽâ€stock, avec apport = dÃƒÂ©bit Ãƒâ€” ÃŽâ€t quand aucune entrÃƒÂ©e manuelle, bornÃƒÂ©e Ã¢â€°Â¥ 0. eauTendanceService.getTendances() ajoute consoEstimeeParJour + aDesCompteurs + debitDisponible (1 lecture supplÃƒÂ©mentaire : getDebitCourantM3h). eauBilanService.getDashboardData() ajoute consoJourEstimee et affiche l\'estimation du jour quand aucun compteur. Bascule auto : dÃƒÂ¨s 1 relevÃƒÂ© compteur, retour au mÃƒÂ©trÃƒÂ© (titre Ã‚Â« mÃƒÂ©trÃƒÂ©e Ã‚Â», sans mention Ã‚Â« estimÃƒÂ©e Ã‚Â»). UI : EauTendancesPage (3 ÃƒÂ©tats Ã¢â‚¬â€ mÃƒÂ©trÃƒÂ© / estimÃƒÂ© avec badge + aide repliable / ÃƒÂ©tat vide Ã‚Â« enregistrez un test de dÃƒÂ©bit Ã‚Â») ; EauDashboard (mention Ã‚Â« estimÃƒÂ©e (dÃƒÂ©bit) Ã‚Â» sous le chiffre). Additif strict, isAnimationActive={false} conservÃƒÂ©. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/services/eauTendanceService.ts : sÃƒÂ©rie consoEstimeeParJour (computeBilan ÃƒÂ  la volÃƒÂ©e) + aDesCompteurs + debitDisponible',
      'modules/gestion-eau/services/eauBilanService.ts : conso du jour estimÃƒÂ©e (computeBilan) + champ consoJourEstimee',
      'modules/gestion-eau/components/EauTendancesPage.tsx : carte conso ÃƒÂ  3 ÃƒÂ©tats (mÃƒÂ©trÃƒÂ©/estimÃƒÂ©+badge+aide/vide) + helper ConsoArea + prop badge',
      'modules/gestion-eau/components/EauDashboard.tsx : mention Ã‚Â« estimÃƒÂ©e (dÃƒÂ©bit) Ã‚Â» sur la carte Conso du jour',
      'modules/gestion-eau/components/eauAideTextes.ts : aide tendancesConsoEstimee',
      'constants/appVersion.ts + package.json : version 3.43.2 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.43.1',
    date: '2026-06-08',
    description: 'fix(gestion-eau) : dÃƒÂ©sactivation de l\'animation des graphiques Recharts (boucle setState Ã‚Â« Maximum update depth exceeded Ã‚Â» sous Recharts 3 + React 19). L\'animation d\'apparition des sÃƒÂ©ries (CurveWithAnimation) entrait en boucle infinie de setState au montage, notamment sur la courbe Ã‚Â« Niveau du bassin Ã‚Â» (Saisie bassin Ã¢â€ â€™ onglet Niveau et page Tendances), faisant planter la page (ErrorBoundary). Correctif minimal et additif : ajout de isAnimationActive={false} sur les 13 sÃƒÂ©ries <Line>/<Area>/<Bar> du module (EauSaisieBassinPage, EauTendancesPage, EauDashboard, EauClientPage, EauFacturationPage, EauSaisieCompteurPage). Les graphiques s\'affichent ÃƒÂ  l\'identique, sans l\'animation d\'apparition. Aucune autre modification de comportement ni de donnÃƒÂ©es. tsc --noEmit OK, build OK. Ãƒâ‚¬ rÃƒÂ©ÃƒÂ©valuer plus tard : une montÃƒÂ©e de version de recharts corrigeant la boucle d\'animation en React 19 permettrait de rÃƒÂ©activer les animations.',
    changes: [
      'modules/gestion-eau/components/EauSaisieBassinPage.tsx : isAnimationActive={false} sur <Line> (Niveau) + <Bar> (DÃƒÂ©bit)',
      'modules/gestion-eau/components/EauTendancesPage.tsx : isAnimationActive={false} sur <Area>, <Line>, 3Ãƒâ€” <Bar>',
      'modules/gestion-eau/components/EauDashboard.tsx : isAnimationActive={false} sur 2Ãƒâ€” <Area>',
      'modules/gestion-eau/components/EauClientPage.tsx + EauFacturationPage.tsx + EauSaisieCompteurPage.tsx : isAnimationActive={false} sur les <Bar>',
      'constants/appVersion.ts + package.json : version 3.43.1',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.43.0',
    date: '2026-06-08',
    description: 'fix(pwa) : mise ÃƒÂ  jour 100% AUTOMATIQUE + rafraÃƒÂ®chissement profond (anti-rÃƒÂ©sidus d\'ancienne version). Cause : le registerSW.js gÃƒÂ©nÃƒÂ©rÃƒÂ© (mode injectManifest) n\'enregistre que sw-custom.js SANS logique d\'auto-update, et sw-custom.ts ne faisait pas skipWaiting ÃƒÂ  l\'install Ã¢â€ â€™ le nouveau SW restait Ã‚Â« waiting Ã‚Â» et l\'ancien continuait de servir des chunks pÃƒÂ©rimÃƒÂ©s ; la seule voie ÃƒÂ©tait le bandeau manuel (standalone) qui ne purgeait pas les caches Ã¢â€ â€™ rÃƒÂ©sidus obligeant ÃƒÂ  se dÃƒÂ©connecter/quitter. Correctifs : (1) sw-custom.ts : self.skipWaiting() ÃƒÂ  l\'install (auto-activation) + cleanupOutdatedCaches() + purge des caches OBSOLÃƒË†TES ÃƒÂ  activate (conserve precache/runtime courants + api-cache ; ne touche JAMAIS IndexedDB/Dexie Ã¢â€ â€™ donnÃƒÂ©es + file de sync hors-ligne prÃƒÂ©servÃƒÂ©es) + clients.claim(). (2) useServiceWorkerUpdate : rechargement AUTOMATIQUE sur controllerchange (garde 1ÃŠÂ³Ã¡Âµâ€° installation via controller null + anti-boucle sessionStorage 10 s) + toast Ã‚Â« Application mise ÃƒÂ  jour Ã¢Å“â€¦ Ã‚Â» au remontage. (3) UpdatePrompt : plus de bandeau Ã¢â‚¬â€ monte seulement le pilote d\'auto-update (rend null). (4) safariServiceWorkerManager : enregistre /sw-custom.js au lieu de /sw.js inexistant (fin du 404, idempotent avec registerSW.js) + bandeau bleu manuel neutralisÃƒÂ©. Transition : les appareils encore sur l\'ancienne version rÃƒÂ©cupÃƒÂ¨rent ce systÃƒÂ¨me au prochain relancement/mÃƒÂ j manuelle, puis tout devient automatique. tsc --noEmit OK, build OK (sw-custom 23.98 kB).',
    changes: [
      'sw-custom.ts : skipWaiting ÃƒÂ  l\'install + cleanupOutdatedCaches + purge caches obsolÃƒÂ¨tes (hors precache/runtime/api-cache, jamais IndexedDB) + clients.claim',
      'hooks/useServiceWorkerUpdate.ts : reload auto sur controllerchange (garde 1ÃŠÂ³Ã¡Âµâ€° install + anti-boucle 10 s) + toast post-update',
      'components/UpdatePrompt.tsx : suppression du bandeau, devient pilote d\'auto-update invisible (rend null)',
      'services/safariServiceWorkerManager.ts : enregistre /sw-custom.js (fin du 404 /sw.js) + bandeau bleu manuel neutralisÃƒÂ©',
      'constants/appVersion.ts + package.json : version 3.43.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.42.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : Ãƒâ€°VO 2/3 Ã¢â‚¬â€ cÃƒÂ¢blage des 3 vraies photos du domaine sur la vitrine Ã‚Â« lien dÃƒÂ©jÃƒÂ  utilisÃƒÂ© Ã‚Â». Les 3 photos fournies par JOEL sont dÃƒÂ©posÃƒÂ©es dans public/gestion-eau/vitrine/ et branchÃƒÂ©es dans VitrinePhoto : (1) ahuvi-golf-practice.jpg Ã‚Â« Le parcours de golf prend forme. Ã‚Â» (icÃƒÂ´ne Flag, inchangÃƒÂ©) ; (2) ahuvi-residences.jpg Ã‚Â« Les RÃƒÂ©sidences, pensÃƒÂ©es pour durer. Ã‚Â» (icÃƒÂ´ne Home, remplace l\'ancien emplacement solaire) ; (3) ahuvi-villa-piscine.jpg Ã‚Â« Les villas du domaine prennent vie. Ã‚Â» (icÃƒÂ´ne Waves, remplace l\'ancien emplacement ponton). LÃƒÂ©gendes adaptÃƒÂ©es aux sujets rÃƒÂ©els (validÃƒÂ©es par JOEL) ; les noms ahuvi-solaire.jpg / ahuvi-ponton.jpg ne sont plus rÃƒÂ©fÃƒÂ©rencÃƒÂ©s. DÃƒÂ©gradation dÃƒÂ©terministe conservÃƒÂ©e (icÃƒÂ´ne en couche de base si une photo manque/charge). Aucun autre changement de comportement. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauVitrinePage.tsx (PARTAGÃƒâ€°) : VitrinePhoto 2 & 3 Ã¢â€ â€™ src ahuvi-residences.jpg / ahuvi-villa-piscine.jpg + lÃƒÂ©gendes + icÃƒÂ´nes Home/Waves ; imports lucide Sun/Anchor Ã¢â€ â€™ Home/Waves',
      'public/gestion-eau/vitrine/ahuvi-golf-practice.jpg / ahuvi-residences.jpg / ahuvi-villa-piscine.jpg (NOUVEAUX assets, 1000Ãƒâ€”563)',
      'constants/appVersion.ts + package.json : version 3.42.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.41.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : ÃƒÂ©dition/suppression d\'un relevÃƒÂ© de niveau de bassin (admin) + recalcul des bilans. Sous l\'onglet Niveau de EauSaisieBassinPage, nouvelle section dÃƒÂ©pliable Ã‚Â« RelevÃƒÂ©s rÃƒÂ©cents (admin) Ã‚Â» (visible si roles.admin uniquement) : liste des 30 derniers relevÃƒÂ©s (date/hauteur/volume via EauListIcon/EauEmptyState), ÃƒÂ©dition inline (input hauteur + datetime-local prÃƒÂ©-rempli, validation hauteurÃ¢â€°Â¥0 + date non vide/non future) Ã¢â€ â€™ updateReleveBassin ; suppression avec showConfirm danger Ã¢â€ â€™ deleteReleveBassin ; bouton Ã‚Â« Recalculer tous les bilans Ã‚Â» Ã¢â€ â€™ recomputeAllBilans (showConfirm). Boutons dÃƒÂ©sactivÃƒÂ©s hors ligne (cohÃƒÂ©rence Dexie+Supabase) + ligne d\'aide. Service eauBilanService : deleteBilanAt(timestamp) (suppression Dexie+Supabase des bilans d\'un horodatage), rebuildBilanForReleve(r) (delete+computeAndSaveBilan), recomputeAllBilans() (clear local + DELETE serveur + reconstruction chronologique, idempotent). Service eauReleveService : nextReleveAfter (helper interne), listRecentRelevesBassin(limit=30), updateReleveBassin (recalcul Ã‚Â« voisins Ã‚Â» Ã¢â€°Â¤3 bilans : ancien emplacement, nouvel emplacement, relevÃƒÂ©s suivants de part et d\'autre ; volume recalculÃƒÂ© via dimensionsFromConfig+hauteurCmToVolumeM3), deleteReleveBassin (retire bilan orphelin + recalcule le suivant) ; addReleveBassin recalcule dÃƒÂ©sormais aussi le bilan du relevÃƒÂ© suivant en saisie rÃƒÂ©tro-datÃƒÂ©e (chemin Ã‚Â« en avant Ã‚Â» inchangÃƒÂ©). Recalcul local et exact : seuls les bilans adjacents repassent Ã‚Â« non traitÃƒÂ© Ã‚Â», les autres (statut traitee/commentaire) sont conservÃƒÂ©s. Additif strict (aucune signature publique existante modifiÃƒÂ©e, computeAndSaveBilan rÃƒÂ©utilisÃƒÂ© tel quel). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/services/eauBilanService.ts (PARTAGÃƒâ€°) : deleteBilanAt / rebuildBilanForReleve / recomputeAllBilans (+ imports supabase/withTimeout/deleteLocal)',
      'modules/gestion-eau/services/eauReleveService.ts (PARTAGÃƒâ€°) : nextReleveAfter (interne) + listRecentRelevesBassin / updateReleveBassin / deleteReleveBassin + recalcul voisin dans addReleveBassin (rÃƒÂ©tro-datage)',
      'modules/gestion-eau/components/EauSaisieBassinPage.tsx (PARTAGÃƒâ€°) : section admin Ã‚Â« RelevÃƒÂ©s rÃƒÂ©cents Ã‚Â» (liste + ÃƒÂ©dition inline + suppression + recalcul global), gating en ligne, visible admin only',
      'constants/appVersion.ts + package.json : version 3.41.0 + note FR',
      'FONCTIONNEMENT-MODULES.md : nouvelle fonction admin (ÃƒÂ©dition/suppression relevÃƒÂ© niveau) + recalcul des bilans',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.40.1',
    date: '2026-06-08',
    description: 'fix(gestion-eau) : Ãƒâ€°VO 2/3 Ã¢â‚¬â€ dÃƒÂ©gradation dÃƒÂ©terministe des photos vitrine. Le composant VitrinePhoto rend dÃƒÂ©sormais l\'icÃƒÂ´ne lucide comme COUCHE DE BASE permanente (toujours dans le fond dÃƒÂ©gradÃƒÂ© AHUVI) avec la <img> superposÃƒÂ©e en object-cover par-dessus : quand la photo charge, elle couvre l\'icÃƒÂ´ne ; quand le chemin est absent, l\'icÃƒÂ´ne reste visible. Motif : en prod (Netlify), un chemin /gestion-eau/vitrine/<x>.jpg absent renvoie le fallback SPA (200/HTML) qui laisse la <img> en ÃƒÂ©tat Ã‚Â« pending Ã‚Â» SANS dÃƒÂ©clencher onError Ã¢â€ â€™ l\'ancien rendu conditionnel (icÃƒÂ´ne seulement sur onError) montrait un fond vide sans icÃƒÂ´ne. Le nouveau rendu garantit Ã‚Â« fond + icÃƒÂ´ne Ã‚Â» dans tous les cas (absent / pending / onError / hors-ligne). VÃƒÂ©rifiÃƒÂ© en ligne sur l\'origine *.netlify.app (SW purgÃƒÂ©) : vitrine marketing OK, icÃƒÂ´nes de repÃƒÂ¨re visibles sur les 3 emplacements photo. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauVitrinePage.tsx (PARTAGÃƒâ€°) : VitrinePhoto Ã¢â‚¬â€ icÃƒÂ´ne en couche de base permanente + <img> superposÃƒÂ©e (dÃƒÂ©gradation dÃƒÂ©terministe quand la photo est absente/pending)',
      'constants/appVersion.ts + package.json : version 3.40.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.40.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : Ãƒâ€°VO 2/3 Ã‚Â« vitrine lien dÃƒÂ©jÃƒÂ  utilisÃƒÂ© Ã‚Â». EauVitrinePage (/i/:token) devient une page ÃƒÂ  deux visages selon getInvitationTokenState (Ãƒâ€°VO 1) : valid Ã¢â€ â€™ ÃƒÂ©cran d\'inscription INCHANGÃƒâ€° (chiffres + 3 bÃƒÂ©nÃƒÂ©fices + Continuer avec Google) ; used|expired|revoked|unknown (+ hors-ligne/erreur) Ã¢â€ â€™ page VITRINE MARKETING (bandeau Ã‚Â« dÃƒÂ©jÃƒÂ  utilisÃƒÂ© Ã‚Â», hero Itampolo Resort, 2 blocs texte figÃƒÂ©s Ã¢â€°Â¤100 mots, 4 astuces, 3 photos avec dÃƒÂ©gradation propre sur onError Ã¢â€ â€™ fond dÃƒÂ©gradÃƒÂ© AHUVI + icÃƒÂ´ne lucide) suivie d\'une fiche Ã‚Â« Demander un accÃƒÂ¨s Ã‚Â» (nom/phone/fonction requis ; email/message optionnels ; select fonction releveur|proprietaire|investisseur|locataire|autre). Le bouton mÃƒÂ©morise setPendingEnrollment(intent:demande enrichi), pose bazarkely_post_login_redirect=/gestion-eau/accueil, RETIRE PENDING_TOKEN_KEY (aucun claim sur lien mort) puis signInWithGoogle ; au retour processPendingEnrollment crÃƒÂ©e la demande. Ãƒâ€°cran de chargement tant que l\'ÃƒÂ©tat du jeton n\'est pas rÃƒÂ©solu. ZÃƒÂ©ro rÃƒÂ©gression sur le chemin valid (code inchangÃƒÂ©). VÃƒÂ©rifs preview : jeton bidon Ã¢â€ â€™ marketing ; 3 photos absentes au build Ã¢â€ â€™ dÃƒÂ©gradation propre (img retirÃƒÂ©es du DOM, aucune erreur console) ; select 6 options exactes ; submit fiche Ã¢â€ â€™ localStorage eau_pending_enrollment {intent:demande, nom/email/phone/fonction/message} + sessionStorage redirect OK + PENDING_TOKEN_KEY null ; validation champs vides Ã¢â€ â€™ toast FR, aucun storage ÃƒÂ©crit ; innerWidth mesurÃƒÂ© 375 px (preset mobile). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauVitrinePage.tsx (PARTAGÃƒâ€°) : branche marketing conditionnelle (getInvitationTokenState) + composant VitrinePhoto (dÃƒÂ©gradation onError) + fiche demande d\'accÃƒÂ¨s (setPendingEnrollment intent demande, removeItem PENDING_TOKEN_KEY avant OAuth) ; chemin valid inchangÃƒÂ©',
      'public/gestion-eau/vitrine/*.jpg (assets, ABSENTS au build de cette version) : ahuvi-golf-practice.jpg / ahuvi-solaire.jpg / ahuvi-ponton.jpg Ã¢â‚¬â€ rÃƒÂ©fÃƒÂ©rencÃƒÂ©s en /gestion-eau/vitrine/<nom>.jpg, ÃƒÂ  dÃƒÂ©poser ultÃƒÂ©rieurement (la page dÃƒÂ©grade proprement sans eux)',
      'constants/appVersion.ts + package.json : version 3.40.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.39.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : Ãƒâ€°VO 3/3 Ã‚Â« import du rÃƒÂ©pertoire Ã¢â€ â€™ lot d\'invitations WhatsApp Ã‚Â». Sur EauDemandesPage (admin), bouton Ã‚Â« Importer du rÃƒÂ©pertoire Ã‚Â» (Contact Picker API, Android Chrome) Ã¢â€ â€™ sÃƒÂ©lection multi-contacts ; mapping pur (nom/tel/email, ÃƒÂ©cart des sans-numÃƒÂ©ro avec compteur) ; panneau de revue (rÃƒÂ´le commun Releveur|Administrateur xor, dÃƒÂ©lai commun 7/30/90/illimitÃƒÂ©, lignes ÃƒÂ©ditables + suppression) ; crÃƒÂ©ation sÃƒÂ©quentielle idempotente via createWhatsappInvitation (role_client:false, compteur_ids:[]) ; panneau Ã‚Â« Liens prÃƒÂªts ÃƒÂ  envoyer Ã‚Â» (Envoyer sur WhatsApp wa.me + Copier le lien par invitation). DÃƒÂ©gradation propre hors Android (bouton dÃƒÂ©sactivÃƒÂ© + Ã‚Â« Disponible sur Android (Chrome) Ã‚Â»). Aide repliable FR. Additif strict : aucune signature de eauInvitationService modifiÃƒÂ©e (rÃƒÂ©utilisation seule). Helper pur utils/contactImport.ts (mapImportedContacts) + 5 tests. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/utils/contactImport.ts (NOUVEAU) : mapImportedContacts (mapping pur des contacts rÃƒÂ©pertoire Ã¢â€ â€™ lignes d\'invitation, ÃƒÂ©cart+compte des sans-numÃƒÂ©ro)',
      'modules/gestion-eau/components/EauDemandesPage.tsx (PARTAGÃƒâ€°) : bouton import + dÃƒÂ©tection Contact Picker + panneau revue du lot (rÃƒÂ´le/dÃƒÂ©lai communs, lignes ÃƒÂ©ditables) + panneau liens prÃƒÂªts + aide repliable',
      'modules/gestion-eau/__tests__/eauContactImport.test.ts (NOUVEAU) : 5 tests du mapping (retenue/ÃƒÂ©cart, nom/email, null/vide, sans-nom)',
      'constants/appVersion.ts + package.json : version 3.39.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.38.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : Ãƒâ€°VO 1/3 Ã‚Â« lien usage unique Ã‚Â» Ã¢â‚¬â€ back (ÃƒÂ©tat du jeton, anonyme) + fiche d\'accÃƒÂ¨s enrichie. Pose le socle serveur des ÃƒÂ©crans ÃƒÂ  venir (Ãƒâ€°VO 2/3), sans nouvel ÃƒÂ©cran ici. SQL (idempotent, exÃƒÂ©cutÃƒÂ© + vÃƒÂ©rifiÃƒÂ© par REST/SQL) : (1) RPC SECURITY DEFINER eau_invitation_token_state(p_token text) returns text, exÃƒÂ©cutable en anon+authenticated (revoke public) : renvoie valid / used (statut=acceptee) / revoked (statut=revoquee) / expired (expires_at dÃƒÂ©passÃƒÂ©) / unknown (jeton vide/null/inconnu) Ã¢â‚¬â€ AUCUNE donnÃƒÂ©e nominative renvoyÃƒÂ©e. (2) eau_demandes_acces gagne phone, fonction, message (text nullable) ; RLS activÃƒÂ©e. (3) eau_create_demande passe de 2 ÃƒÂ  5 params (p_email, p_nom, p_phone, p_fonction, p_message) : la signature 2-args est DROP, la nouvelle est authenticated-only (revoke public+anon) ; idempotente (UPDATE de la demande en_attente existante du user, sinon INSERT) Ã¢â€ â€™ pas de doublon. VÃƒÂ©rifs prod : 7 cas d\'ÃƒÂ©tat OK (valid/used/revoked/expired + 3 unknown), anon ne peut PAS appeler eau_create_demande (42501), colonnes prÃƒÂ©sentes. Front (additif, offline-first) : type DemandeAccesRow + phone/fonction/message ; Dexie GestionEauDB v5 (champs texte non indexÃƒÂ©s, donnÃƒÂ©es conservÃƒÂ©es) ; eauDemandeService.DemandeInput + createDemande (5 params RPC + record local) ; eauEnrollmentService.PendingEnrollment intent demande enrichi (email/phone/fonction/message) + processPendingEnrollment relaie les champs (email rÃƒÂ©el du compte Google prioritaire) ; eauInvitationService.getInvitationTokenState(token) (RPC anon, withTimeout 6 s, dÃƒÂ©faut unknown si erreur/hors-ligne Ã¢â€ â€™ la vitrine montrera la page marketing, jamais une inscription trompeuse). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/types/gestionEau.ts (PARTAGÃƒâ€°) : DemandeAccesRow + phone/fonction/message (string|null)',
      'modules/gestion-eau/db/gestionEauDb.ts (PARTAGÃƒâ€°) : GestionEauDB version(5) (champs texte non indexÃƒÂ©s, migration additive)',
      'modules/gestion-eau/services/eauDemandeService.ts (PARTAGÃƒâ€°) : DemandeInput + phone/fonction/message ; createDemande appelle eau_create_demande (5 params) + report local',
      'modules/gestion-eau/services/eauEnrollmentService.ts (PARTAGÃƒâ€°) : PendingEnrollment intent demande enrichi + processPendingEnrollment relaie les champs',
      'modules/gestion-eau/services/eauInvitationService.ts (PARTAGÃƒâ€°) : helper getInvitationTokenState(token) (RPC anon eau_invitation_token_state, dÃƒÂ©faut unknown)',
      'SQL Supabase (PARTAGÃƒâ€°) : RPC eau_invitation_token_state ; colonnes phone/fonction/message + RLS sur eau_demandes_acces ; eau_create_demande 2Ã¢â€ â€™5 params (authenticated-only)',
      'constants/appVersion.ts + package.json : version 3.38.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.37.1',
    date: '2026-06-08',
    description: 'fix(gestion-eau) : aperÃƒÂ§u WhatsApp recentrÃƒÂ© (anti-rognage) + cache-bust de l\'image OG. Correctif cosmÃƒÂ©tique bornÃƒÂ© aux 2 edge functions (Deno), aucun schÃƒÂ©ma/donnÃƒÂ©e/ÃƒÂ©cran. (1) og-invite.tsx : toute la composition de l\'image PNG 1200Ãƒâ€”630 est dÃƒÂ©sormais centrÃƒÂ©e horizontalement ET verticalement dans une zone de sÃƒÂ©curitÃƒÂ© centrale, pour rester entiÃƒÂ¨rement visible quand WhatsApp recadre l\'aperÃƒÂ§u en carrÃƒÂ© centrÃƒÂ© (~630Ãƒâ€”630) dans le fil. Avant, le contenu ÃƒÂ©tait calÃƒÂ© ÃƒÂ  gauche (root sans alignItems, lignes header/center/footer sans justifyContent) Ã¢â€ â€™ WhatsApp rognait les bords et coupait le grand Ã‚Â« X % Ã‚Â». Changements : conteneur racine + alignItems:center + textAlign:center ; les 3 lignes (h/c/f) + justifyContent:center ; header centrÃƒÂ© ; bloc central alignItems:center + textAlign:center ; pastille tendance alignSelf flex-start Ã¢â€ â€™ center ; footer/bandeau justifyContent:center + textAlign:center + maxWidth 620px ; gros nombre fontSize 210Ã¢â€ â€™190px (marge pour Ã‚Â« 100 % Ã‚Â») ; slogan gÃƒÂ©nÃƒÂ©rique maxWidth 960Ã¢â€ â€™620px. InchangÃƒÂ© : dimensions 1200Ãƒâ€”630, charte AHUVI, textes FR figÃƒÂ©s, repli anti-500, fetchStats, cache-control. (2) invite-og.ts : og:image et twitter:image pointent vers /og-invite.png?v=2 (cache-buster) pour forcer WhatsApp/Facebook ÃƒÂ  re-tÃƒÂ©lÃƒÂ©charger la version recentrÃƒÂ©e (le ?v= est ignorÃƒÂ© cÃƒÂ´tÃƒÂ© edge, l\'endpoint rÃƒÂ©pond toujours). Reste de l\'injecteur inchangÃƒÂ© (purge anti-doublon, jeton non exposÃƒÂ© hors og:url, description dynamique). Rappel : WhatsApp met l\'aperÃƒÂ§u en cache PAR lien Ã¢â€ â€™ tester avec un NOUVEAU lien /i/<jeton> (au besoin re-scrape via Facebook Sharing Debugger). tsc --noEmit OK, build OK.',
    changes: [
      'frontend/netlify/edge-functions/og-invite.tsx (PARTAGÃƒâ€°) : recentrage horizontal+vertical (zone de sÃƒÂ©curitÃƒÂ© centrale), pastille alignSelf center, fontSize 210Ã¢â€ â€™190, slogan maxWidth 620 Ã¢â‚¬â€ anti-rognage carrÃƒÂ© WhatsApp',
      'frontend/netlify/edge-functions/invite-og.ts (PARTAGÃƒâ€°) : og:image/twitter:image Ã¢â€ â€™ /og-invite.png?v=2 (cache-bust pour forcer le re-tÃƒÂ©lÃƒÂ©chargement)',
      'constants/appVersion.ts + package.json : version 3.37.1 + note FR',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.37.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : Phase 3 Ã‚Â« aperÃƒÂ§u WhatsApp Ã‚Â» Ã¢â‚¬â€ Netlify Edge Functions (Open Graph + image PNG dynamique). Le robot d\'aperÃƒÂ§u de WhatsApp/Facebook n\'exÃƒÂ©cute pas le JavaScript : la PWA seule renvoie un <head> sans contenu social. Deux edge functions (Deno) ajoutÃƒÂ©es sous frontend/netlify/edge-functions, dÃƒÂ©clarÃƒÂ©es dans netlify.toml. (1) invite-og sur /i/* : rÃƒÂ©cupÃƒÂ¨re le HTML de l\'app (context.next Ã¢â€ â€™ fallback SPA index.html), lit les chiffres NON nominatifs via la RPC anon eau_public_vitrine_stats() (timeout 2,5 s, dÃƒÂ©gradation propre), PURGE les balises og/twitter par dÃƒÂ©faut de index.html puis INJECTE les balises dynamiques (og:title Ã‚Â« Gestion Eau AHUVI Ã¢â‚¬â€ Vous ÃƒÂªtes invitÃƒÂ©(e) Ã‚Â», og:description avec Ã‚Â« Bassin rempli ÃƒÂ  X % (en hausse/baisse/stable)Ã¢â‚¬Â¦ Ã‚Â» ou texte gÃƒÂ©nÃƒÂ©rique, og:image absolue, og:image:width/height/type, og:url, og:type, og:site_name, og:locale=fr_FR, twitter:card=summary_large_image + titre/description/image) ; Cache-Control court ; le jeton n\'apparaÃƒÂ®t jamais hors og:url. (2) og-invite sur /og-invite.png : VRAI PNG 1200Ãƒâ€”630 (pas de SVG) gÃƒÂ©nÃƒÂ©rÃƒÂ© via og_edge (SatoriÃ¢â€ â€™Resvg, Noto Sans embarquÃƒÂ©) en charte AHUVI (dÃƒÂ©gradÃƒÂ© forest #364E30 Ã¢â€ â€™ teal #10939F, accent or #C3C067, goutte dessinÃƒÂ©e) Ã¢â‚¬â€ avec chiffres : gros Ã‚Â« X % Ã‚Â» + Ã‚Â« Niveau du bassin Ã‚Â» + pastille tendance + bandeau bas ; sans chiffres : slogan gÃƒÂ©nÃƒÂ©rique. Anti-500 : tout ÃƒÂ©chec de rendu retombe sur un PNG plein valide embarquÃƒÂ© (base64). Image SANS jeton (chiffres globaux du bassin) Ã¢â€ â€™ une seule image partagÃƒÂ©e, cache long. index.html gagne des balises OG de base pour le reste du site (remplacÃƒÂ©es par l\'edge sur /i/*). Limite connue (documentÃƒÂ©e) : WhatsApp met en cache l\'aperÃƒÂ§u par URL plusieurs jours ; comme chaque invitation a un jeton unique, l\'aperÃƒÂ§u est frais au 1er partage et ne se met pas ÃƒÂ  jour ensuite pour ce mÃƒÂªme lien (sans importance : 1 lien = 1 personne). Aucune modification du front du module (vitrine = Phase 2). Hors tsconfig (Deno/edge), non bundlÃƒÂ© cÃƒÂ´tÃƒÂ© client. tsc --noEmit OK, build OK.',
    changes: [
      'netlify.toml (PARTAGÃƒâ€°) : 2 blocs [[edge_functions]] (invite-og Ã¢â€ â€™ /i/*, og-invite Ã¢â€ â€™ /og-invite.png)',
      'frontend/netlify/edge-functions/invite-og.ts (NOUVEAU) : injection Open Graph dynamique sur /i/* (RPC anon eau_public_vitrine_stats, purge+injection balises, jeton jamais exposÃƒÂ©)',
      'frontend/netlify/edge-functions/og-invite.tsx (NOUVEAU) : image PNG 1200Ãƒâ€”630 via og_edge (charte AHUVI, chiffres ou gÃƒÂ©nÃƒÂ©rique), repli PNG embarquÃƒÂ© anti-500',
      'frontend/index.html (PARTAGÃƒâ€°) : balises Open Graph de base (site), remplacÃƒÂ©es par l\'edge sur /i/*',
      'constants/appVersion.ts + package.json : version 3.37.0 + note FR',
      'FONCTIONNEMENT-MODULES.md : aperÃƒÂ§u WhatsApp (edge OG + image PNG) + limite de cache WhatsApp',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.36.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : Phase 4 Ã‚Â« invitation vitrine WhatsApp par JETON Ã‚Â» Ã¢â‚¬â€ UI admin (page /gestion-eau/demandes). EauDemandesPage gagne un sÃƒÂ©lecteur de canal (onglets Email / WhatsApp) dans le formulaire Ã‚Â« Inviter Ã‚Â». Canal WhatsApp (par dÃƒÂ©faut) : numÃƒÂ©ro requis + nom optionnel + rÃƒÂ´les cumulables (Admin/Releveur/Client, Ã¢â€°Â¥1 compteur si client) + dÃƒÂ©lai de validitÃƒÂ© (7/30/90 j ou illimitÃƒÂ©) Ã¢â€ â€™ createWhatsappInvitation (Phase 1, offline-first, jeton + expires_at + invite_channel=whatsapp). Ãƒâ‚¬ la crÃƒÂ©ation : bandeau de confirmation affichant le lien buildInviteUrl(token) (1sakely.org/i/<token>) + boutons Ã‚Â« Envoyer sur WhatsApp Ã‚Â» (buildWhatsappInviteUrl Ã¢â€ â€™ wa.me, message FR centrÃƒÂ© sur le lien, AUCUNE adresse Google imposÃƒÂ©e), Ã‚Â« Copier le lien Ã‚Â», Ã‚Â« Copier le message Ã‚Â». Deux helpers purs ajoutÃƒÂ©s au service : buildWhatsappInviteMessage + buildWhatsappInviteUrl. Nouvelle liste Ã‚Â« Invitations par lien WhatsApp Ã‚Â» (filtre invite_channel===whatsapp, tri en_attente<acceptÃƒÂ©e<expirÃƒÂ©e) : icÃƒÂ´ne de rÃƒÂ´le, nom/numÃƒÂ©ro, badges, statut (En attente / AcceptÃƒÂ©e leÃ¢â‚¬Â¦ / ExpirÃƒÂ©e si expires_at<now), expiration affichÃƒÂ©e ; actions Renvoyer WhatsApp (mÃƒÂªme jeton), Copier le lien, RÃƒÂ©voquer (confirmation). La liste email existante est conservÃƒÂ©e ÃƒÂ  part (filtre invite_channel!==whatsapp) ; les demandes reÃƒÂ§ues inchangÃƒÂ©es. Aide repliable mise ÃƒÂ  jour (deux canaux + diffÃƒÂ©rence email/jeton). IcÃƒÂ´nes lucide MessageCircle/Link/CalendarClock. Bloc rÃƒÂ©servÃƒÂ© admin (route dÃƒÂ©jÃƒÂ  sous garde). Additif bornÃƒÂ© ÃƒÂ  EauDemandesPage + 2 helpers service + texte d\'aide. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauDemandesPage.tsx (PARTAGÃƒâ€°) : onglets canal Email/WhatsApp, formulaire WhatsApp (numÃƒÂ©ro + dÃƒÂ©lai), confirmation lien + wa.me + copier lien/message, liste Ã‚Â« Invitations par lien WhatsApp Ã‚Â» (statut/expiration/renvoyer/copier/rÃƒÂ©voquer), liste email conservÃƒÂ©e ÃƒÂ  part',
      'modules/gestion-eau/services/eauInvitationService.ts (PARTAGÃƒâ€°) : helpers buildWhatsappInviteMessage + buildWhatsappInviteUrl (message FR jeton, sans adresse Google imposÃƒÂ©e)',
      'modules/gestion-eau/components/eauAideTextes.ts (PARTAGÃƒâ€°) : aide Ã‚Â« invitations Ã‚Â» maj (deux canaux + diffÃƒÂ©rence email/jeton)',
      'constants/appVersion.ts + package.json : version 3.36.0 + note FR',
      'FONCTIONNEMENT-MODULES.md : invitation WhatsApp par jeton (UI) + enrÃƒÂ´lement compte Google au choix',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.35.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : Phase 2 Ã‚Â« invitation vitrine WhatsApp par JETON Ã‚Â» Ã¢â‚¬â€ page vitrine publique /i/:token + capture jeton + atterrissage. Nouvelle route PUBLIQUE /i/:token (dÃƒÂ©clarÃƒÂ©e dans App.tsx au mÃƒÂªme niveau que /gestion-eau/accueil et /gestion-eau/scan, hors garde d\'auth) Ã¢â€ â€™ composant lazy EauVitrinePage (charte AHUVI, mobile-first, une colonne) : en-tÃƒÂªte lÃƒÂ©ger Ã°Å¸â€™Â§ Ã‚Â« Gestion Eau AHUVI Ã‚Â» + slogan + ligne d\'invitation ; bloc chiffres NON nominatifs via RPC publique eau_public_vitrine_stats() (anon, withTimeout 6000) Ã¢â€ â€™ grand Ã‚Â« {fill_pct} % Ã‚Â» + libellÃƒÂ© + tendance (TrendingUp/Down/Minus = en hausse/baisse/stable) + Ã‚Â« RelevÃƒÂ© du JJ/MM/AAAA Ã‚Â» ; dÃƒÂ©gradation propre (slogan Ã‚Â« Le suivi de l\'eau, clair et toujours ÃƒÂ  jour. Ã‚Â» sans chiffre) si null/erreur/hors-ligne ; 3 bÃƒÂ©nÃƒÂ©fices (Gauge/BadgeCheck/WifiOff) ; CTA unique Ã‚Â« Continuer avec Google Ã‚Â» (mÃƒÂ©morise eau_pending_invitation_token = jeton de l\'URL + bazarkely_post_login_redirect = /gestion-eau/accueil, deep-link robuste au boot ÃƒÂ  froid sans garde de rÃƒÂ´le pour ÃƒÂ©viter le rebond /gestion-eauÃ¢â€ â€™/dashboard, puis signInWithGoogle) ; aide repliable Ã‚Â« Comment ÃƒÂ§a marche ? Ã‚Â». Le jeton est aussi capturÃƒÂ© dÃƒÂ¨s l\'arrivÃƒÂ©e (couvre le cas Ã‚Â« dÃƒÂ©jÃƒÂ  connectÃƒÂ© Ã‚Â»). Redirection post-claim ajoutÃƒÂ©e dans GestionEauContext.load : si claimPendingTokenInvitation renvoie un id (jeton fraÃƒÂ®chement consommÃƒÂ©), navigation vers invitationTargetPath(rÃƒÂ´le) (releveur/admin Ã¢â€ â€™ /gestion-eau/releves?tab=bassin&bt=niveau ; client Ã¢â€ â€™ /gestion-eau/client) Ã¢â‚¬â€ une seule fois (jeton retirÃƒÂ© au succÃƒÂ¨s). Cas Ã‚Â« dÃƒÂ©jÃƒÂ  connectÃƒÂ© en arrivant Ã‚Â» : relance retryAccess() pour enchaÃƒÂ®ner le claim ; jeton invalide/expirÃƒÂ© Ã¢â€ â€™ message neutre Ã‚Â« invitation invalide/expirÃƒÂ©e Ã‚Â» sans ÃƒÂ©jection ni boucle. Additif (1 route + 1 page + redirection post-claim). tsc --noEmit OK, build OK.',
    changes: [
      'App.tsx (PARTAGÃƒâ€°) : route publique /i/:token (lazy EauVitrinePage), hors garde d\'auth, au niveau de /gestion-eau/accueil et /gestion-eau/scan',
      'modules/gestion-eau/components/EauVitrinePage.tsx (NOUVEAU) : page vitrine publique (chiffres anon eau_public_vitrine_stats + bÃƒÂ©nÃƒÂ©fices + CTA Google + aide repliable + message neutre jeton invalide)',
      'modules/gestion-eau/context/GestionEauContext.tsx (PARTAGÃƒâ€°) : redirection post-claim Ã¢â‚¬â€ navigate(invitationTargetPath(rÃƒÂ´le)) quand claimPendingTokenInvitation renvoie un id (import invitationTargetPath + useNavigate)',
      'constants/appVersion.ts + package.json : version 3.35.0 + note FR',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.34.0',
    date: '2026-06-08',
    description: 'feat(gestion-eau) : Phase 1 Ã‚Â« invitation vitrine WhatsApp par JETON Ã‚Â» Ã¢â‚¬â€ socle back + service + claim au login. 2Ã¡Âµâ€° canal d\'invitation : l\'admin n\'a que le numÃƒÂ©ro WhatsApp (pas l\'email). On crÃƒÂ©e une invitation portant un jeton unique ; au 1er login Google (compte au choix de l\'invitÃƒÂ©), le JETON Ã¢â‚¬â€ et non l\'email Ã¢â‚¬â€ dÃƒÂ©clenche l\'octroi du rÃƒÂ´le. SQL (idempotent, exÃƒÂ©cutÃƒÂ©+vÃƒÂ©rifiÃƒÂ© via REST) : eau_invitations gagne token (index unique partiel WHERE token is not null), expires_at, invite_channel (\'email\'|\'whatsapp\', dÃƒÂ©faut email) ; email devient nullable. RPC SECURITY DEFINER eau_claim_invitation_by_token(p_token) (usage unique, idempotent mÃƒÂªme user, refuse jeton inconnu/expirÃƒÂ©/dÃƒÂ©jÃƒÂ  acceptÃƒÂ© ; upsert eau_roles, crÃƒÂ©e/active eau_comptes_client + compteurs si role_client) ; revoke execute from public,anon + grant authenticated (anonÃ¢â€ â€™401 42501). RPC PUBLIQUE eau_public_vitrine_stats() (grant anon) : agrÃƒÂ©gats NON nominatifs uniquement (% remplissage rÃƒÂ©fÃƒÂ©rencÃƒÂ© flotteur + tendance + horodatage), dÃƒÂ©grade en null si config/relevÃƒÂ©s manquants, jamais d\'erreur. Tests RPC (harnais transactionnel annulÃƒÂ©, lecture REST) : jeton releveurÃ¢â€ â€™eau_roles.releveur=true + acceptee + idempotent + 2Ã¡Âµâ€° user null + expirÃƒÂ© null + clientÃ¢â€ â€™compte actif + compteurs Ã¢Å“â€¦. Code (additif, scopÃƒÂ© module) : InvitationRow gagne token/expires_at/invite_channel (email nullable) ; Dexie v4 (index token) ; service eauInvitationService (generateInviteToken base64url 16o, buildInviteUrl /i/<token>, createWhatsappInvitation offline-first, claimPendingTokenInvitation best-effort lisant sessionStorage[eau_pending_invitation_token]) ; appel claimPendingTokenInvitation dans GestionEauContext.load juste aprÃƒÂ¨s le claim email (en ligne, best-effort, avant lecture des rÃƒÂ´les). Aucune nouvelle UI/ÃƒÂ©cran (Phases 2-4). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/types/gestionEau.ts (PARTAGÃƒâ€°) : InvitationRow + token/expires_at/invite_channel, email nullable',
      'modules/gestion-eau/db/gestionEauDb.ts (PARTAGÃƒâ€°) : Dexie v4 Ã¢â‚¬â€ index token sur eau_invitations',
      'modules/gestion-eau/services/eauInvitationService.ts (PARTAGÃƒâ€°) : generateInviteToken/buildInviteUrl/createWhatsappInvitation/claimPendingTokenInvitation + createInvitation maj (champs canal email)',
      'modules/gestion-eau/context/GestionEauContext.tsx (PARTAGÃƒâ€°) : appel claimPendingTokenInvitation(online) dans load(), juste aprÃƒÂ¨s claimInvitationForCurrentUser',
      'SQL Supabase : eau_invitations (token/expires_at/invite_channel, email nullable) + RPC eau_claim_invitation_by_token + RPC publique eau_public_vitrine_stats',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.33.0',
    date: '2026-06-07',
    description: 'feat(gestion-eau) : Phase 2 Ã‚Â« invitation par email Ã‚Â» Ã¢â‚¬â€ UI admin (page Ã‚Â« Invitations & demandes Ã‚Â») + envoi WhatsApp (wa.me). La page /gestion-eau/demandes (EauDemandesPage, sous garde admin) gagne : (1) un formulaire d\'invitation (nom optionnel, email Google requis et normalisÃƒÂ© lower-case, numÃƒÂ©ro WhatsApp requis, rÃƒÂ´les cumulables Admin/Releveur + option Client Ã¢â€ â€™ multiselect compteurs) ; (2) ÃƒÂ  la crÃƒÂ©ation, un bouton Ã‚Â« Envoyer sur WhatsApp Ã‚Â» (+ Ã‚Â« Copier le message Ã‚Â» en secours) qui ouvre wa.me avec un message FR prÃƒÂ©-rempli contenant le lien profond selon le rÃƒÂ´le (Releveur/Admin Ã¢â€ â€™ /gestion-eau/releves?tab=bassin&bt=niveau ; Client seul Ã¢â€ â€™ /gestion-eau/client) et l\'email exact, en insistant sur l\'usage de CETTE adresse Google ; (3) une liste des invitations (en_attente puis acceptee, revoquee masquÃƒÂ©es) avec Renvoyer WhatsApp et RÃƒÂ©voquer (en_attente uniquement, avec confirmation). La gestion des demandes reÃƒÂ§ues (valider/refuser) est conservÃƒÂ©e. Idempotence : createInvitation met ÃƒÂ  jour l\'invitation en_attente existante du mÃƒÂªme email (id + date conservÃƒÂ©s) au lieu d\'en crÃƒÂ©er une 2Ã¡Âµâ€°. Helpers wa.me purs et testables dans eauInvitationService (normalizeWhatsappNumber : 0XXXXXXXXX Ã¢â€ â€™ 261XXXXXXXXX ; invitationRoleLabel ; invitationTargetPath ; invitationDeepLink ; buildInvitationMessage ; buildWhatsappUrl). Aucune nouvelle table/SQL (tout posÃƒÂ© en Phase 1). Pas de second header (shell partagÃƒÂ©). Offline : crÃƒÂ©ation offline-first (saveLocal) ; si window.open ÃƒÂ©choue Ã¢â€ â€™ repli Ã‚Â« copier le message Ã‚Â». tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauDemandesPage.tsx (PARTAGÃƒâ€°) : formulaire d\'invitation + liste invitations (renvoyer/rÃƒÂ©voquer) + bouton WhatsApp, titre Ã‚Â« Invitations & demandes Ã‚Â», gestion des demandes reÃƒÂ§ues conservÃƒÂ©e',
      'modules/gestion-eau/services/eauInvitationService.ts (PARTAGÃƒâ€°) : createInvitation idempotent (maj de l\'invitation en_attente existante) + helpers wa.me (normalizeWhatsappNumber/invitationRoleLabel/invitationTargetPath/invitationDeepLink/buildInvitationMessage/buildWhatsappUrl)',
      'modules/gestion-eau/components/eauAideTextes.ts (PARTAGÃƒâ€°) : entrÃƒÂ©e d\'aide Ã‚Â« invitations Ã‚Â»',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.32.0',
    date: '2026-06-07',
    description: 'feat(gestion-eau) : Phase 1 Ã‚Â« invitation par email Ã‚Â» Ã¢â‚¬â€ socle + octroi automatique du rÃƒÂ´le au 1er login Google. Un admin prÃƒÂ©-enregistre une invitation (email Google, rÃƒÂ´les admin/releveur/client cumulables, compteurs visibles pour un client). Ãƒâ‚¬ la connexion de la personne avec cette adresse Google, son rÃƒÂ´le est attribuÃƒÂ© SANS validation, et Ã¢â‚¬â€ si client Ã¢â‚¬â€ son compte client + compteurs sont crÃƒÂ©ÃƒÂ©s/activÃƒÂ©s. SQL (idempotent, exÃƒÂ©cutÃƒÂ©+vÃƒÂ©rifiÃƒÂ©) : table eau_invitations (PK id text, statut en_attente/acceptee/revoquee, compteur_ids jsonb), RLS active policy admin-only (eau_is_admin()), index partiel lower(email) WHERE en_attente ; RPC SECURITY DEFINER eau_claim_invitation() (cherche une invitation en_attente pour lower(auth.jwt()->>email), upsert eau_roles ON CONFLICT (user_id), crÃƒÂ©e/active eau_comptes_client si role_client, marque acceptee) ; revoke execute from public+anon, grant to authenticated. Tests RLS (transaction annulÃƒÂ©e) : anonÃ¢â€ â€™401 42501, authenticated sans invitationÃ¢â€ â€™null, invitation releveurÃ¢â€ â€™eau_roles.releveur=true + acceptee + 2Ã¡Âµâ€° appel null (idempotent), invitation clientÃ¢â€ â€™compte actif + compteurs, non-admin ne voit aucune invitation (0), admin voit (1). Code (additif, scopÃƒÂ© module) : type InvitationLocal, store Dexie eau_invitations (v3, additif), eau_invitations dans PK_BY_TABLE + EAU_TABLES (sync), service eauInvitationService (claimInvitationForCurrentUser best-effort online + createInvitation/listInvitations/revokeInvitation pour la Phase 2), appel claimInvitationForCurrentUser dans GestionEauContext.load AVANT ensureRolesBootstrap (en ligne uniquement, best-effort, n\'ÃƒÂ©crit rien en local Ã¢â‚¬â€ le pull des rÃƒÂ´les reflÃƒÂ¨te l\'octroi). Aucune UI admin (Phase 2). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/types/gestionEau.ts (PARTAGÃƒâ€°) : type InvitationRow/InvitationLocal + InvitationStatut',
      'modules/gestion-eau/db/gestionEauDb.ts (PARTAGÃƒâ€°) : store eau_invitations (Dexie v3, additif) + entrÃƒÂ©e EAU_TABLES',
      'modules/gestion-eau/services/eauSync.ts (PARTAGÃƒâ€°) : eau_invitations dans PK_BY_TABLE',
      'modules/gestion-eau/services/eauInvitationService.ts (NOUVEAU) : claimInvitationForCurrentUser + createInvitation/listInvitations/getInvitation/revokeInvitation/refreshInvitations',
      'modules/gestion-eau/context/GestionEauContext.tsx (PARTAGÃƒâ€°) : appel claimInvitationForCurrentUser(online) dans load(), avant ensureRolesBootstrap, en ligne, best-effort',
      'SQL Supabase : table eau_invitations + RLS admin-only + RPC eau_claim_invitation() (SECURITY DEFINER, revoke anon/public, grant authenticated)',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.31.4',
    date: '2026-06-07',
    description: 'fix(shell) : verrou de navigation inter-modules Ã¢â‚¬â€ un rechargement (F5/Shift+Ctrl+R) ou l\'ouverture directe d\'une adresse de module prÃƒÂ©serve l\'URL et MAINTIENT l\'utilisateur dans son module (eau /gestion-eau, construction /construction/*, budget /transactionsÃ¢â‚¬Â¦). Cause racine (chemin latent du shell, complÃƒÂ©mentaire ÃƒÂ  v3.29.1 garde de rÃƒÂ´le et v3.31.3 reprise auto restreinte) : la branche non authentifiÃƒÂ©e de AppLayout faisait <Navigate to="/auth" replace/> sur le catch-all ; pendant la fenÃƒÂªtre de boot oÃƒÂ¹ isAuthenticated est false (restauration session Supabase / refresh token), ce Navigate ÃƒÂ©crasait l\'URL courante par /auth, puis au retour de session la branche authentifiÃƒÂ©e (qui n\'a pas de route /auth) retombait sur <Navigate to="/dashboard"/> Ã¢â€ â€™ ÃƒÂ©jection vers le tableau de bord, tous modules confondus. Correctif principal (4.1) : remplacer ce Navigate par un rendu d\'AuthPage SUR PLACE (<Route path="*" element={<AuthPage/>}/>) Ã¢â‚¬â€ l\'URL n\'est jamais modifiÃƒÂ©e ; quand la session se restaure, AppLayout re-rend la branche authentifiÃƒÂ©e sur la MÃƒÅ ME adresse. AuthPage rendu hors /auth ne navigue pas sur un simple F5 (handleOAuthCallback ne navigue que s\'il y a des jetons OAuth en attente). Correctif secondaire (4.2, sans risque OAuth) : un login Google initiÃƒÂ© depuis un lien profond mÃƒÂ©morise l\'adresse d\'origine (sessionStorage bazarkely_post_login_redirect, hors /auth et /) et y revient aprÃƒÂ¨s le callback, sinon /dashboard par dÃƒÂ©faut. Aucun changement au flux OAuth (capture jetons, detectSessionInUrl:false, setSession, ordre onAuthStateChange). Non-rÃƒÂ©gression vÃƒÂ©rifiÃƒÂ©e : ModuleSwitcherContext (reprise auto limitÃƒÂ©e ÃƒÂ  /dashboard) inchangÃƒÂ© ; routes publiques /gestion-eau/accueil et /gestion-eau/scan intactes ; useRequireAuth (navigate /auth) est du code mort non utilisÃƒÂ©. tsc --noEmit OK, build OK.',
    changes: [
      'components/Layout/AppLayout.tsx : branche non authentifiÃƒÂ©e Ã¢â‚¬â€ <Navigate to="/auth"/> remplacÃƒÂ© par un rendu d\'AuthPage sur place (catch-all), l\'URL courante n\'est plus jamais ÃƒÂ©crasÃƒÂ©e',
      'pages/AuthPage.tsx : handleGoogleSignIn mÃƒÂ©morise l\'adresse d\'origine (bazarkely_post_login_redirect) ; handleOAuthCallback navigue vers cette adresse si prÃƒÂ©sente, sinon /dashboard (seule la cible de navigation post-login change)',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.31.3',
    date: '2026-06-07',
    description: 'fix(shell) : la reprise automatique du dernier module n\'a plus lieu QUE depuis la racine neutre /dashboard. Arriver directement (lien, signet, F5) sur une route explicite d\'un autre module Ã¢â‚¬â€ /gestion-eau, /construction/... Ã¢â‚¬â€ n\'y rebondit plus vers /dashboard. Cause prouvÃƒÂ©e (RAPPORT-DIAGNOSTIC-deeplink-rebond) : le useEffect de restauration de ModuleSwitcherContext incluait /gestion-eau et /construction/dashboard dans isDefaultRoute ; si le module sauvÃƒÂ© (bazarkely Ã¢â€ â€™ /dashboard) Ã¢â€°Â  module de la route courante, navigate(savedModule.path) ÃƒÂ©jectait l\'utilisateur indÃƒÂ©pendamment du rÃƒÂ´le (d\'oÃƒÂ¹ l\'ÃƒÂ©chec du correctif rÃƒÂ´le-ÃƒÂ -froid v3.29.1). Correctif minimal : isDefaultRoute = (currentPath === \'/dashboard\'). Auto-reprise login Ã¢â€ â€™ /dashboard Ã¢â€ â€™ dernier module conservÃƒÂ©e ; switcher in-app inchangÃƒÂ©. tsc --noEmit OK, build OK.',
    changes: [
      'contexts/ModuleSwitcherContext.tsx : useEffect de restauration Ã¢â‚¬â€ isDefaultRoute restreint ÃƒÂ  la seule racine neutre /dashboard (retrait de /construction/dashboard et /gestion-eau)',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.31.2',
    date: '2026-06-07',
    description: 'fix(gestion-eau) : les icÃƒÂ´nes des 3 cartes bassin du tableau de bord ouvrent dÃƒÂ©sormais le BON sous-onglet de la saisie bassin via un paramÃƒÂ¨tre de deep-link `bt` (bassin-tab). Stock actuel Ã¢â€ â€™ bt=niveau, EntrÃƒÂ©es du jour Ã¢â€ â€™ bt=entree, DÃƒÂ©bit courant Ã¢â€ â€™ bt=debit (carte Dernier bilan Ã¢â€ â€™ bt=niveau). EauSaisieBassinPage lit `bt` directement via useSearchParams (approche la moins invasive, le composant importait dÃƒÂ©jÃƒÂ  react-router-dom) : helper pur parseBassinTab valide la valeur contre \'entree\'|\'niveau\'|\'debit\' (toute autre valeur ou absence Ã¢â€ â€™ \'niveau\', zÃƒÂ©ro rÃƒÂ©gression) ; ÃƒÂ©tat initialisÃƒÂ© sur la valeur lue + useEffect([btParam]) pour basculer le sous-onglet sur un nouveau deep-link sans remontage. Un changement manuel d\'onglet (boutons) ne touche pas l\'URL Ã¢â€ â€™ non ÃƒÂ©crasÃƒÂ© par l\'effet. EauRelevesPage NON modifiÃƒÂ©e : elle prÃƒÂ©serve dÃƒÂ©jÃƒÂ  `bt` (ne nettoie la query que sur changement d\'onglet de page). Cartes compteur (?tab=compteur), destinations Ã‚Â« voir Ã‚Â» et logique ?tab=/?c= inchangÃƒÂ©es. Navigation pure (aucun appel rÃƒÂ©seau). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauDashboard.tsx : goSaisieBassin(bt) paramÃƒÂ©trÃƒÂ© Ã¢â€ â€™ ?tab=bassin&bt=<niveau|entree|debit> ; onIconClick des cartes Stock/EntrÃƒÂ©es/DÃƒÂ©bit + Dernier bilan ciblent le bon sous-onglet ; cartes compteur inchangÃƒÂ©es',
      'modules/gestion-eau/components/EauSaisieBassinPage.tsx : import useSearchParams ; helper parseBassinTab ; ÃƒÂ©tat tab initialisÃƒÂ© via ?bt= ; useEffect([btParam]) pour basculer sur deep-link sans remontage',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.31.1',
    date: '2026-06-07',
    description: 'fix(gestion-eau) : marge basse (padding-bottom) scopÃƒÂ©e au module pour que la derniÃƒÂ¨re carte d\'une page longue dÃƒÂ©gage entiÃƒÂ¨rement la BottomNav sur mobile. La BottomNav du module Eau dÃƒÂ©passe les 80px (pb-20) du <main> partagÃƒÂ© (libellÃƒÂ©s sur 2 lignes Ã‚Â« Tableau de bord Ã‚Â» / Ã‚Â« Facturation Ã‚Â» + env(safe-area-inset-bottom) Android), recouvrant la bordure basse de la derniÃƒÂ¨re carte. Les pages BazarKELY de base ne sont pas touchÃƒÂ©es car elles ajoutent dÃƒÂ©jÃƒÂ  leur propre pb-20 (Ã¢â€°Ë†160px). Correctif STRICTEMENT additif et isolÃƒÂ© : un seul <div className="pb-[calc(5rem+env(safe-area-inset-bottom))]"> enveloppe les <Routes> du module dans GestionEauRoutes.tsx Ã¢â‚¬â€ vit uniquement sous l\'arbre /gestion-eau/*, zÃƒÂ©ro impact sur AppLayout, BottomNav, les autres modules ou le desktop. 5rem rÃƒÂ©plique la marge des pages de base (pb-20 du <main> + 5rem = 160px). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/GestionEauRoutes.tsx : <div pb-[calc(5rem+env(safe-area-inset-bottom))]> autour de <Routes> Ã¢â‚¬â€ marge basse scopÃƒÂ©e au module, derniÃƒÂ¨re carte dÃƒÂ©gagÃƒÂ©e au-dessus de la BottomNav sur mobile',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.31.0',
    date: '2026-06-07',
    description: 'feat(gestion-eau) : tableau de bord /gestion-eau Ã¢â‚¬â€ cartes cliquables (voir / saisir) + tri en 2 colonnes thÃƒÂ©matiques. Chaque carte KPI a dÃƒÂ©sormais 2 zones cliquables imbriquÃƒÂ©es (patron DashboardPage BazarKELY) : le CORPS navigue vers la page Ã‚Â« voir Ã‚Â» (Tendances, ou Suivi pour NRW et Dernier bilan), l\'ICÃƒâ€NE (avec stopPropagation) navigue vers la page Ã‚Â« saisir Ã‚Â» (/gestion-eau/releves?tab=bassin ou ?tab=compteur). Les 7 cartes sont rangÃƒÂ©es en 2 colonnes : gauche = saisie bassin (Stock, EntrÃƒÂ©es, DÃƒÂ©bit), droite = saisie compteur (Conso du jour, NRW, Conso rÃƒÂ©seau, Autonomie) Ã¢â‚¬â€ hauteurs inÃƒÂ©gales assumÃƒÂ©es. La carte Ã‚Â« Dernier bilan Ã‚Â» (corpsÃ¢â€ â€™Suivi, icÃƒÂ´neÃ¢â€ â€™saisie bassin) et les 2 mini-graphiques (toute la zoneÃ¢â€ â€™Tendances) sont aussi cliquables. Aucun chevron affichÃƒÂ© (hideChevron), apparence des cartes strictement inchangÃƒÂ©e (teintes/tailles/icÃƒÂ´nes/valeurs). AccessibilitÃƒÂ© : corps = div role="button" tabIndex=0 + clavier Enter/Espace (jamais de <button> imbriquÃƒÂ©), bouton-icÃƒÂ´ne avec aria-label. EauStatCard (PARTAGÃƒâ€°) reÃƒÂ§oit 3 props OPTIONNELLES additives (onIconClick, iconAriaLabel, hideChevron) : usages sans ces props (EauRapportsPage, EauScanResolverPage) rendus ÃƒÂ  l\'identique. Navigation pure (aucun appel rÃƒÂ©seau nouveau). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauUi.tsx (PARTAGÃƒâ€°) : EauStatCard Ã¢â‚¬â€ props additives onIconClick/iconAriaLabel/hideChevron ; quand onIconClick fourni, corps = div role="button" (clavier) et icÃƒÂ´ne = <button> stopPropagation ; rendu inchangÃƒÂ© sans ces props',
      'modules/gestion-eau/components/EauDashboard.tsx : useNavigate + helpers goTendances/goSuivi/goSaisieBassin/goSaisieCompteur ; grille en 2 colonnes flex (bassin / compteur) ; onClick/onIconClick sur les 7 cartes ; Card local rendu cliquable (corps + icÃƒÂ´ne) pour Dernier bilan ; 2 mini-graphes en div role="button" Ã¢â€ â€™ Tendances (Link interne en stopPropagation)',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.30.1',
    date: '2026-06-07',
    description: 'feat(gestion-eau) : champ Ã‚Â« Date et heure Ã‚Â» OPTIONNEL sur la saisie du bassin (EauSaisieBassinPage), onglets Niveau et EntrÃƒÂ©e. Permet d\'horodater un relevÃƒÂ©/une entrÃƒÂ©e ÃƒÂ  une date passÃƒÂ©e au lieu de l\'instant prÃƒÂ©sent. Champ <input type="datetime-local"> placÃƒÂ© aprÃƒÂ¨s la Note, avant le bouton Enregistrer, prÃƒÂ©cÃƒÂ©dÃƒÂ© d\'une icÃƒÂ´ne CalendarClock + ligne d\'aide Ã‚Â« Laisser vide = date et heure d\'aujourd\'hui Ã‚Â». Vide Ã¢â€ â€™ comportement inchangÃƒÂ© (le service applique nowIso()). Rempli Ã¢â€ â€™ timestamp ISO transmis ÃƒÂ  addReleveBassin/addEntreeBassin (qui acceptaient dÃƒÂ©jÃƒÂ  timestamp?: string). Garde douce : une date dans le futur bloque l\'enregistrement (toast Ã‚Â« Date dans le futur impossible Ã‚Â»). Champ rÃƒÂ©initialisÃƒÂ© aprÃƒÂ¨s succÃƒÂ¨s. Strictement additif : aucun service, schÃƒÂ©ma ni signature modifiÃƒÂ©s ; onglet DÃƒÂ©bit, calcul du volume et dÃƒÂ©clenchement du bilan inchangÃƒÂ©s. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/EauSaisieBassinPage.tsx : 2 ÃƒÂ©tats (niveauDateTime/entreeDateTime), helpers purs toIsoOrUndefined/isFuture, champ datetime-local + aide sur onglets Niveau et EntrÃƒÂ©e, garde futur + reset aprÃƒÂ¨s succÃƒÂ¨s, timestamp transmis aux services',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.30.0',
    date: '2026-06-07',
    description: 'PHASE 2 SÃƒâ€°CURITÃƒâ€° du module gestion-eau : verrouillage RLS par rÃƒÂ´le + ownership client (cÃƒÂ´tÃƒÂ© serveur). Remplace les policies permissives `public using(true)` (S85) par 63 policies `to public` CONDITIONNÃƒâ€°ES par des prÃƒÂ©dicats `auth.uid()`/rÃƒÂ´le sur les 16 tables eau_* (RLS forcÃƒÂ©e enable sur toutes). Choix d\'architecture (issu du diagnostic Phase 1) : rÃƒÂ´le `public` + prÃƒÂ©dicat (et NON `to authenticated`) Ã¢â‚¬â€ une requÃƒÂªte rÃƒÂ©siduelle anon (course au boot, sync de fond) est ainsi filtrÃƒÂ©e ÃƒÂ  0 ligne au lieu d\'ÃƒÂªtre rejetÃƒÂ©e en 401 (mÃƒÂªme isolation, plus robuste). Helpers SECURITY DEFINER `eau_is_admin()`/`eau_is_releveur()`/`eau_client_has_compteur(text)` (search_path figÃƒÂ©, grant public, bypass RLS via owner postgres Ã¢â€ â€™ pas de rÃƒÂ©cursion). Matrice : admin=tout ; releveur=lit compteurs/QR/config/bassin + insÃƒÂ¨re relevÃƒÂ©s/bassin, MAIS ne lit ni factures ni comptes_client ; client=lit UNIQUEMENT ses compteurs/relevÃƒÂ©s/factures (via compteur_ids jsonb de son compte actif), JAMAIS le bassin ni un voisin. Bassin (eau_releves_bassin/entrees_bassin/bilans/debit_tests) invisible au client (aucune branche client). Parcours sans rÃƒÂ´le dÃƒÂ©placÃƒÂ©s en RPC SECURITY DEFINER : `eau_claim_enrolement(p_code)` (enrÃƒÂ´lement par code) et `eau_create_demande(p_email,p_nom)` ; durcissement : revoke execute FROM anon (pas seulement public Ã¢â‚¬â€ Supabase grant EXECUTE explicitement ÃƒÂ  anon par dÃƒÂ©faut) sur ces RPC + eau_bootstrap_admin Ã¢â€ â€™ un anon reÃƒÂ§oit 401 Ã‚Â« permission denied Ã‚Â». CÃƒÂ¢blage app : eauCompteClientService.linkByEnrolementCode appelle eau_claim_enrolement puis pullTable ; eauDemandeService.createDemande appelle eau_create_demande (repli offline-first conservÃƒÂ© : INSERT acceptÃƒÂ© par `with check user_id=auth.uid()`). Tests nÃƒÂ©gatifs vÃƒÂ©rifiÃƒÂ©s REST : anon = 0 ligne en lecture sur les 16 tables + ÃƒÂ©criture refusÃƒÂ©e (401 RLS) ; 0 policy permissive rÃƒÂ©siduelle. tsc --noEmit OK, build OK. Hors pÃƒÂ©rimÃƒÂ¨tre : redirect deep-link /gestion-eauÃ¢â€ â€™/dashboard au hard-reload (bug shell prÃƒÂ©-existant).',
    changes: [
      'SQL (Supabase, via ÃƒÂ©diteur, RÃƒË†GLE #0ter) : helpers eau_is_admin/eau_is_releveur/eau_client_has_compteur (SECURITY DEFINER, grant public) ; RPC eau_claim_enrolement + eau_create_demande (SECURITY DEFINER, grant authenticated, revoke anon) ; durcissement eau_bootstrap_admin (revoke anon) ; alter table enable RLS Ãƒâ€”16 ; drop de toutes les policies eau_* (dont public using(true) de S85) ; 63 policies par rÃƒÂ´le (to public + prÃƒÂ©dicats auth.uid()), bassin invisible au client',
      'modules/gestion-eau/services/eauCompteClientService.ts : linkByEnrolementCode passe par la RPC eau_claim_enrolement + pullTable (le client ne lit plus eau_comptes_client en clair) ; repli local synthÃƒÂ©tisÃƒÂ© si pull rÃƒÂ©seau ratÃƒÂ©',
      'modules/gestion-eau/services/eauDemandeService.ts : createDemande passe par la RPC eau_create_demande ; repli offline-first conservÃƒÂ© (INSERT user_id=auth.uid() acceptÃƒÂ© par RLS)',
      'eauSync inchangÃƒÂ© (pullTable/pushTable tolÃƒÂ¨rent dÃƒÂ©jÃƒÂ  retour filtrÃƒÂ© / refus RLS Ã¢â‚¬â€ best-effort, pas de crash)',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.29.1',
    date: '2026-06-07',
    description: 'fix(gestion-eau): deep-link / hard-reload sur /gestion-eau ne rebondit plus vers /dashboard. DIAGNOSTIC (navigateur, RÃƒË†GLE #0ter) : l\'hypothÃƒÂ¨se Ã‚Â« course ÃƒÂ  l\'hydratation du shell Ã‚Â» est INFIRMÃƒâ€°E Ã¢â‚¬â€ isAuthenticated est persistÃƒÂ© et zustand v5+localStorage le rÃƒÂ©hydrate de faÃƒÂ§on SYNCHRONE (true dÃƒÂ¨s le 1er rendu) ; preuve : hard-reload sur /transactions et /family reste stable (un vrai bug shell les ferait aussi rebondir). La VRAIE cause est dans le module eau : au dÃƒÂ©marrage ÃƒÂ  froid (Dexie eau_roles vide), si pullTable(eau_roles) est lent/ÃƒÂ©choue/timeout, getRolesForUser renvoie tout ÃƒÂ  false et GestionEauRoute (valid + !isLoading + !hasEauAccess) faisait Navigate /dashboard alors que l\'utilisateur est admin (warm = rÃƒÂ´le en cache Ã¢â€ â€™ OK ; d\'oÃƒÂ¹ l\'intermittence). CORRECTIF (additif, scopÃƒÂ© module) : pullTable expose dÃƒÂ©sormais `ok` (serveur a rÃƒÂ©pondu vs erreur/timeout) ; ensureRolesBootstrap rÃƒÂ©essaie le pull eau_roles (3 tentatives) et retourne { roles, confirmed } ; GestionEauContext expose rolesConfirmed + retryAccess ; GestionEauRoute ne redirige vers /dashboard QUE sur refus CONFIRMÃƒâ€° (rolesConfirmed && !hasEauAccess), sinon affiche un ÃƒÂ©cran d\'attente Ã‚Â« VÃƒÂ©rification de votre accÃƒÂ¨sÃ¢â‚¬Â¦ Ã‚Â» + bouton RÃƒÂ©essayer (jamais de rebond silencieux). Non-rÃƒÂ©gression : un vrai utilisateur sans rÃƒÂ´le eau (pull OK, 0 rÃƒÂ´le) est toujours redirigÃƒÂ© ; logique de session Phase 1 (sessionStatus) inchangÃƒÂ©e. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/services/eauSync.ts : pullTable() retourne { pulled, ok } Ã¢â‚¬â€ `ok` distingue Ã‚Â« serveur a rÃƒÂ©pondu Ã‚Â» de Ã‚Â« erreur/timeout Ã‚Â» (tous les appelants existants ignorent le retour : additif sans rÃƒÂ©gression)',
      'modules/gestion-eau/services/eauRoleService.ts : ensureRolesBootstrap() retourne { roles, confirmed } + retry du pull eau_roles (ROLE_PULL_MAX_ATTEMPTS=3) ; hors-ligne, confirmed = prÃƒÂ©sence d\'un cache local (rÃƒÂ´le ou compte client)',
      'modules/gestion-eau/context/GestionEauContext.tsx : ÃƒÂ©tat rolesConfirmed + action retryAccess() ; cÃƒÂ¢blage de la rÃƒÂ©solution { roles, confirmed }',
      'modules/gestion-eau/components/GestionEauRoute.tsx : redirect /dashboard UNIQUEMENT sur refus confirmÃƒÂ© ; sinon ÃƒÂ©cran EauAccessPendingScreen (attente + RÃƒÂ©essayer) ; toast Ã‚Â« AccÃƒÂ¨s refusÃƒÂ© Ã‚Â» gardÃƒÂ© sur rolesConfirmed',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.29.0',
    date: '2026-06-07',
    description: 'PHASE 1 SÃƒâ€°CURITÃƒâ€° du module gestion-eau (fondation session & identitÃƒÂ©, GO/NO-GO Ã¢â€ â€™ GO). Aucune RLS restrictive introduite : les policies eau restent `public` (verrouillage = Phase 2). Diagnostic Ã‚Â« anon Ã‚Â» ÃƒÂ©lucidÃƒÂ© : la session Supabase EST authentifiÃƒÂ©e (JWT role=authenticated, sub == users.id), le client partagÃƒÂ© porte le JWT sur toutes les requÃƒÂªtes eau ; la cause rÃƒÂ©elle du Ã‚Â« anon Ã‚Â» historique est une COURSE AU BOOT sur rÃƒÂ©seau lent (au montage, Zustand persistÃƒÂ© pas encore rÃƒÂ©hydratÃƒÂ© + getSession() pas prÃƒÂªt Ã¢â€ â€™ getCurrentUserIdSafe() null Ã¢â€ â€™ rÃƒÂ´les vides Ã¢â€ â€™ redirect /dashboard, et une ÃƒÂ©criture prÃƒÂ©coce dans cette fenÃƒÂªtre partirait sans Authorization = anon Ã¢â€ â€™ 401 sous une policy authenticated). Le passage en `public` (S85) avait masquÃƒÂ© ce symptÃƒÂ´me. (B) Garantie de session au montage : nouveau waitForEauSession (eauAuth, lecture localStorage en retries, jamais de rÃƒÂ©seau, jamais de getUser) absorbe la course au boot ; GestionEauContext expose sessionStatus (checking/valid/needs-reauth/mismatch) calculÃƒÂ© ÃƒÂ  partir de getSession + identitÃƒÂ© (session.user.id === store.user.id) ; GestionEauRoute affiche un spinner en Ã‚Â« checking Ã‚Â» (plus de redirect prÃƒÂ©maturÃƒÂ©), l\'ÃƒÂ©cran EauReauthScreen (Ã‚Â« Se reconnecter avec Google Ã‚Â») en Ã‚Â« needs-reauth Ã‚Â»/Ã‚Â« mismatch Ã‚Â», et ne redirige vers /dashboard que si la session est fiable mais sans rÃƒÂ´le. Aucune 2Ã¡Âµâ€° identitÃƒÂ© crÃƒÂ©ÃƒÂ©e ; persistSession + autoRefreshToken inchangÃƒÂ©s (connexion une seule fois, session conservÃƒÂ©e entre pages/fermetures) ; offline prÃƒÂ©servÃƒÂ© (session dÃƒÂ©jÃƒÂ  ÃƒÂ©tablie Ã¢â€ â€™ lecture Dexie). (C) Bootstrap propriÃƒÂ©taire CÃƒâ€TÃƒâ€° SERVEUR : nouvelle RPC idempotente eau_bootstrap_admin() (SECURITY DEFINER) qui pose admin=true sur auth.uid() uniquement si aucun admin n\'existe ; ensureRolesBootstrap appelle supabase.rpc + pullTable(eau_roles), suppression de l\'ancien setRoles()+push direct de la ligne admin (offline : lecture locale sans push). tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/services/eauAuth.ts : getEauSession() + waitForEauSession() (retries getSession, absorbe la course au boot, pas de rÃƒÂ©seau)',
      'modules/gestion-eau/context/GestionEauContext.tsx : type EauSessionStatus + ÃƒÂ©tat sessionStatus + vÃƒÂ©rification session/identitÃƒÂ© au montage + action reauth() ; n\'utilise plus getCurrentUserIdSafe directement',
      'NEW modules/gestion-eau/components/EauReauthScreen.tsx : ÃƒÂ©cran de reconnexion Google (cas needs-reauth/mismatch), charte AHUVI',
      'modules/gestion-eau/components/GestionEauRoute.tsx : gÃƒÂ¨re sessionStatus (spinner en checking, EauReauthScreen sinon) Ã¢â€ â€™ plus de redirect prÃƒÂ©maturÃƒÂ© vers /dashboard',
      'modules/gestion-eau/components/index.ts : export EauReauthScreen',
      'modules/gestion-eau/services/eauRoleService.ts : ensureRolesBootstrap via RPC serveur eau_bootstrap_admin (idempotente) + pullTable, retrait du bootstrap admin local',
      'SQL : CREATE OR REPLACE FUNCTION eau_bootstrap_admin() SECURITY DEFINER (idempotente) + GRANT EXECUTE TO authenticated Ã¢â‚¬â€ exÃƒÂ©cutÃƒÂ© et vÃƒÂ©rifiÃƒÂ© via REST (aucune policy restrictive ajoutÃƒÂ©e)',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.28.0',
    date: '2026-06-06',
    description: 'AHUVI Eau module header logo switched to the official vector asset from root logo.svg (dark rounded square, cyan gauge arc, water drop) Ã¢â‚¬â€ WITHOUT the "A" letter and with an adjusted drop gradient (#2a9bc0 -> #0d6f8d, previously #1d8fad -> #0f6f8c, and the text glyph removed). Asset moved from repo root logo.svg to modules/gestion-eau/assets/ahuvi-eau-logo.svg (root logo.svg removed; logo.png kept for future PWA icons). EauLogo.tsx updated accordingly (still inline SVG, className prop, unique gradient id ahuviDropGrad, role/aria-label). Header.tsx wiring from v3.27.0 unchanged (already renders <EauLogo /> when isEauModule, "B" square otherwise). Strictly additive/cosmetic; no regression on BazarKELY/Construction logos; logo click still toggles the module switcher.',
    changes: [
      'modules/gestion-eau/assets/ahuvi-eau-logo.svg : content replaced with official logo.svg (no "A", gradient #2a9bc0 -> #0d6f8d)',
      'modules/gestion-eau/components/EauLogo.tsx : removed the "A" text glyph, updated gradient stops',
      'Removed root logo.svg (logo.png kept)',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.27.1',
    date: '2026-06-06',
    description: 'fix: menu Eau Ã‚Â« Mise ÃƒÂ  jour Ã‚Â» reste dans le module (route /gestion-eau/version). Le bouton Ã‚Â« Mise ÃƒÂ  jour Ã‚Â» de HeaderEauActions pointait vers /app-version, route transversale globale non prÃƒÂ©fixÃƒÂ©e Ã¢â€ â€™ moduleIdForPath() renvoyait \'bazarkely\' et le switcher rebasculait header + BottomNav sur la coquille BazarKELY (utilisateur ÃƒÂ©jectÃƒÂ© du module). Correctif strictement additif : AppVersionPage (gÃƒÂ©nÃƒÂ©rique, sans paramÃƒÂ¨tre de route) est dÃƒÂ©sormais aussi montÃƒÂ©e sous /gestion-eau/version dans GestionEauRoutes (sans garde de rÃƒÂ´le), et le bouton cible cette route. La route globale /app-version est conservÃƒÂ©e pour la coquille et les autres modules. tsc --noEmit OK, build OK.',
    changes: [
      'modules/gestion-eau/components/GestionEauRoutes.tsx : route enfant `version` rendant AppVersionPage (partagÃƒÂ©e), avant le catch-all',
      'components/Layout/header/HeaderEauActions.tsx : bouton Ã‚Â« Mise ÃƒÂ  jour Ã‚Â» Ã¢â€ â€™ /gestion-eau/version (au lieu de /app-version)',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.27.0',
    date: '2026-06-06',
    description: 'AHUVI Eau module header logo. The generic "B" square in the Gestion Eau header is replaced by the AHUVI Eau logo (dark rounded square, cyan gauge arc, water drop, white "A" reserved in the drop). Rendered inline as SVG (new component modules/gestion-eau/components/EauLogo.tsx) Ã¢â‚¬â€ no <img> request, crisp at any size, immune to Service Worker caching, unique stable gradient id. Asset of reference stored at modules/gestion-eau/assets/ahuvi-eau-logo.svg. Header.tsx (SHARED) change is strictly additive: the EauLogo only renders when isEauModule is true; BazarKELY and Construction keep the unchanged "B" square. The logo button still toggles the module switcher (onClick, logoRipple, aria-label, title preserved). Root-level stray "logo [GestionEAU].svg" removed.',
    changes: [
      'NEW modules/gestion-eau/assets/ahuvi-eau-logo.svg : reference SVG asset (with the white "A")',
      'NEW modules/gestion-eau/components/EauLogo.tsx : inline SVG React component (className prop, unique gradient id)',
      'modules/gestion-eau/components/index.ts : export EauLogo',
      'SHARED components/Layout/Header.tsx : render <EauLogo /> in the logo button when isEauModule, "B" square otherwise (additive)',
      'Removed stray root file "logo [GestionEAU].svg"',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.26.1',
    date: '2026-06-06',
    description: 'CORRECTIF Ã‚Â« Scan de ticket Ã‚Â» : suppression EN CASCADE du reÃƒÂ§u (transaction_receipts, 1:1) et des lignes d\'article (transaction_items, 1:N) quand la transaction parente est supprimÃƒÂ©e Ã¢â‚¬â€ dette de la Phase 2 (orphelins en local Dexie ET cÃƒÂ´tÃƒÂ© Supabase). (A) CÃƒÂ´tÃƒÂ© base : les contraintes FK transaction_id de transaction_items et transaction_receipts sont recrÃƒÂ©ÃƒÂ©es en ON DELETE CASCADE (bloc DDL idempotent et robuste quel que soit le nom de contrainte d\'origine Ã¢â‚¬â€ vÃƒÂ©rifiÃƒÂ© confdeltype=\'c\' sur les deux), et les orphelins dÃƒÂ©jÃƒÂ  prÃƒÂ©sents ont ÃƒÂ©tÃƒÂ© purgÃƒÂ©s (vÃƒÂ©rif REST/SQL : 0 orphelin items, 0 orphelin receipts). Quand la suppression de la transaction est rejouÃƒÂ©e (envoi direct online ou file DELETE), Postgres supprime automatiquement reÃƒÂ§u + lignes Ã¢â€ â€™ aucun DELETE sÃƒÂ©parÃƒÂ© n\'est mis en file. (B) CÃƒÂ´tÃƒÂ© app (Dexie ne gÃƒÂ¨re pas les FK) : transactionService.deleteTransaction supprime explicitement, juste aprÃƒÂ¨s db.transactions.delete(id), les transactionItems puis transactionReceipts rattachÃƒÂ©s (where transactionId = id). Idempotent (re-supprimer ne casse rien), non bloquant (try/catch warn). Couvre aussi la ligne jumelle d\'un transfert (appel rÃƒÂ©cursif) et le bouton Ã‚Â« Restituer Ã‚Â» (restoreBalance), la cascade s\'exÃƒÂ©cutant indÃƒÂ©pendamment de la restitution du solde. Aucune rÃƒÂ©gression sur la suppression de transactions sans reÃƒÂ§u ni sur les transferts. tsc --noEmit OK, build OK.',
    changes: [
      'PARTAGÃƒâ€° services/transactionService.ts : cascade locale Dexie (transactionItems + transactionReceipts) dans deleteTransaction, aprÃƒÂ¨s la suppression de la transaction',
      'SQL : FK transaction_id de transaction_items + transaction_receipts recrÃƒÂ©ÃƒÂ©es en ON DELETE CASCADE (DO block robuste/idempotent) + purge des orphelins existants (exÃƒÂ©cutÃƒÂ© et vÃƒÂ©rifiÃƒÂ© : confdeltype=\'c\', 0 orphelin)',
    ],
    type: 'patch' as const,
  },
  {
    version: '3.26.0',
    date: '2026-06-06',
    description: 'PHASE 2 du Ã‚Â« Scan de ticket Ã‚Â» : 2Ã¡Âµâ€° moteur OCR EN LIGNE haute prÃƒÂ©cision (Google Cloud Vision) avec bascule automatique online/offline. La clÃƒÂ© Google Vision reste CÃƒâ€TÃƒâ€° SERVEUR via une Netlify Function `/.netlify/functions/ocr-receipt` (POST image base64 Ã¢â€ â€™ DOCUMENT_TEXT_DETECTION, languageHints fr Ã¢â€ â€™ { text, confidence }) Ã¢â‚¬â€ jamais dans le bundle client (vÃƒÂ©rifiÃƒÂ© : GOOGLE_VISION_API_KEY et vision.googleapis.com absents de dist). ocrService.recognize() : en ligne Ã¢â€ â€™ recognizeOnline (appel fonction, withTimeout 12 s) ; hors-ligne OU ÃƒÂ©chec/timeout/texte vide/quota Vision Ã¢â€ â€™ repli SILENCIEUX recognizeOffline (Tesseract, Phase 1) Ã¢â‚¬â€ aucun blocage utilisateur. Chaque rÃƒÂ©sultat porte engine = google_vision | tesseract, tracÃƒÂ© dans transaction_receipts.ocr_engine. Le parsing (receiptParser) reste COMMUN aux deux moteurs (texte Vision plus propre Ã¢â€ â€™ meilleurs rÃƒÂ©sultats sans dupliquer la logique). Seuil de confiance par moteur : Tesseract prudent (0,75, revue plus frÃƒÂ©quente), Vision plus permissif (0,60) car texte propre Ã¢â‚¬â€ la cohÃƒÂ©rence ÃŽÂ£ lignes Ã¢â€°Ë† total reste le vrai garde-fou (confidenceThresholdFor). DÃƒÂ©gradation propre : hors-ligne = aucun appel rÃƒÂ©seau ; en ligne mais Vision KO = repli Tesseract + log. Function : limite taille image (Ã¢â€°Â¤ 8 Mo base64 Ã¢â€ â€™ 413), gestion clÃƒÂ© absente (503), erreur/quota Vision (502), timeout (504, AbortController 10 s). Aucune dÃƒÂ©pendance npm ajoutÃƒÂ©e (fetch/Buffer/AbortController natifs Node 20). tsc (gate --noEmit) OK, build OK, 20 tests Phase 1 non rÃƒÂ©gressÃƒÂ©s.',
    changes: [
      'Nouveau frontend/netlify/functions/ocr-receipt.ts : Netlify Function Google Vision (clÃƒÂ© serveur process.env.GOOGLE_VISION_API_KEY, jamais exposÃƒÂ©e ; limites de taille + erreurs/timeout/quota gÃƒÂ©rÃƒÂ©s)',
      'services/ocrService.ts : type OcrEngine, recognizeOnline() (appel fonction + withTimeout), recognize() (bascule auto onlineÃ¢â€ â€™Vision / offline|ÃƒÂ©checÃ¢â€ â€™Tesseract), recognizeOffline() renvoie dÃƒÂ©sormais engine',
      'constants/receipt.ts : RECEIPT_CONFIDENCE_THRESHOLD_VISION (0,60) + confidenceThresholdFor(engine) ; seuil Tesseract (0,75) conservÃƒÂ©',
      'components/Receipt/ReceiptScanButton.tsx : utilise recognize(), applique le seuil selon le moteur, stocke l\'ocr_engine RÃƒâ€°EL (plus de \'tesseract\' en dur)',
      'Variable d\'environnement Netlify GOOGLE_VISION_API_KEY (clÃƒÂ© serveur) Ã¢â‚¬â€ ÃƒÂ  renseigner cÃƒÂ´tÃƒÂ© Netlify si pas encore fait ; repli Tesseract tant qu\'absente',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.25.0',
    date: '2026-06-06',
    description: 'PHASE 1 du Ã‚Â« Scan de ticket de caisse Ã‚Â», intÃƒÂ©grÃƒÂ©e au flux Transactions (pas un nouveau module). Depuis /add-transaction (dÃƒÂ©penses ponctuelles), un bouton Ã‚Â« Scanner un ticket Ã‚Â» (icÃƒÂ´ne ScanLine + aide Ã¢â€œËœ dÃƒÂ©pliable) ouvre la camÃƒÂ©ra arriÃƒÂ¨re (input capture=environment, repli galerie). L\'image est prÃƒÂ©-traitÃƒÂ©e en mÃƒÂ©moire (downscale ~1500px + niveaux de gris, jamais stockÃƒÂ©e) puis lue HORS-LIGNE et gratuitement par Tesseract.js (langue fra, OEM LSTM, worker+cÃ…â€œur WASM simd-lstm+donnÃƒÂ©es servis depuis /public/tesseract Ã¢â‚¬â€ aucun CDN runtime ; assets PRÃƒâ€°CACHÃƒâ€°S par le service worker pour un OCR 100% hors-ligne). Parsing pur et testÃƒÂ© (receiptParser) : fournisseur (1ÃŠÂ³Ã¡Âµâ€° ligne textuelle), lignes d\'article (libellÃƒÂ©/quantitÃƒÂ© via Ã‚Â« 2 x 1500 Ã‚Â»/prix), total (TOTAL/NET/Ãƒâ‚¬ PAYER sinon ÃŽÂ£ lignes), exclusion TVA/rendu/dates/moyens de paiement, score de confiance (confiance OCR + cohÃƒÂ©rence ÃŽÂ£ vs total). Ã‚Â« Correction si doute Ã‚Â» : confiance Ã¢â€°Â¥ seuil (0,75) ET cohÃƒÂ©rent Ã¢â€ â€™ insertion directe ; sinon ÃƒÂ©cran de relecture/correction (fournisseur, lignes ÃƒÂ©ditables, compte, catÃƒÂ©gorie suggÃƒÂ©rÃƒÂ©e, date). CrÃƒÂ©ation : 1 transaction expense (montant = total) + N transaction_items + 1 transaction_receipts (avec receipt_md, seule trace conservÃƒÂ©e Ã¢â‚¬â€ aucune image). DÃƒÂ©tail transaction : carte Ã‚Â« Articles du ticket Ã‚Â» (fournisseur + lignes + total) avec ÃƒÂ©dition inline (corriger/ajouter/supprimer Ã¢â€ â€™ recalcul du total ET ajustement du solde du compte) + Ã‚Â« Voir le ticket Ã‚Â» (markdown). CatÃƒÂ©gorie suggÃƒÂ©rÃƒÂ©e (historique fournisseur puis mots-clÃƒÂ©s), jamais bloquante. Offline-first : Dexie v17 (transactionReceipts/transactionItems), sync Supabase idempotente (id client, upsert onConflict, rejeu ignoreDuplicates) ; tables transaction_receipts/transaction_items + RLS user_id=auth.uid(). DÃƒÂ©pendance ajoutÃƒÂ©e : tesseract.js (assets locaux ~7,2 Mo prÃƒÂ©cachÃƒÂ©s). tsc --noEmit OK, build OK, 20 tests (parser + recalcul total + rendu carte).',
    changes: [
      'Nouveaux : types/receipt.ts, services/receiptParser.ts (+ tests), services/ocrService.ts (Tesseract hors-ligne), services/receiptService.ts (offline-first), utils/receiptImage.ts (prÃƒÂ©-traitement), constants/receipt.ts (seuil de confiance)',
      'Nouveaux composants : components/Receipt/ReceiptScanButton.tsx (flux captureÃ¢â€ â€™OCRÃ¢â€ â€™dÃƒÂ©cision), ReviewReceipt.tsx (relecture/correction), ReceiptItemsCard.tsx (carte Articles ÃƒÂ©ditable) + tests',
      'Assets OCR locaux : public/tesseract/ (worker.min.js, core/tesseract-core-simd-lstm.wasm(.js), lang/fra.traineddata.gz Ã‚Â« fast Ã‚Â») Ã¢â‚¬â€ servis localement, prÃƒÂ©cachÃƒÂ©s par le SW',
      'PARTAGÃƒâ€° src/types/index.ts : SyncOperation.table_name ÃƒÂ©tend transaction_receipts/transaction_items',
      'PARTAGÃƒâ€° lib/database.ts : Dexie v17 (transactionReceipts/transactionItems, migration additive)',
      'PARTAGÃƒâ€° services/apiService.ts : upsertReceipt/upsertReceiptItems/getReceiptByTransaction/getItemsByTransaction/deleteReceiptItem (upsert idempotent)',
      'PARTAGÃƒâ€° services/syncManager.ts : cas de rejeu transaction_receipts/transaction_items (upsert ignoreDuplicates + DELETE)',
      'PARTAGÃƒâ€° pages/AddTransactionPage.tsx : bouton Ã‚Â« Scanner un ticket Ã‚Â» (dÃƒÂ©penses ponctuelles)',
      'PARTAGÃƒâ€° pages/TransactionDetailPage.tsx : carte Ã‚Â« Articles du ticket Ã‚Â» (hors ÃƒÂ©dition) + rafraÃƒÂ®chissement aprÃƒÂ¨s ÃƒÂ©dition',
      'PARTAGÃƒâ€° vite.config.ts : globPatterns injectManifest ÃƒÂ©tendus (wasm,gz) pour prÃƒÂ©cacher les assets OCR',
      'SQL : CREATE transaction_receipts + transaction_items (+ index + RLS user_id=auth.uid()), exÃƒÂ©cutÃƒÂ© et vÃƒÂ©rifiÃƒÂ© via REST (nÃƒÂ©gatif anon INSERT Ã¢â€ â€™ 401)',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.24.0',
    date: '2026-06-06',
    description: 'Ãƒâ€°VOLUTION Ã‚Â« Iconographie + graphiques Ã‚Â» du module gestion-eau. (A) Iconographie systÃƒÂ©matique faÃƒÂ§on BazarKELY mais en charte AHUVI (vert forÃƒÂªt #364E30 / olive #4C6D40 + accent or #9D9B4B ; plus aucun violet/bleu Ã¢â‚¬â€ teal conservÃƒÂ© comme accent eau, ambre/rouge conservÃƒÂ©s pour le sens des alertes). Chaque bouton d\'action porte une icÃƒÂ´ne en tÃƒÂªte, chaque carte KPI une icÃƒÂ´ne dans un conteneur teintÃƒÂ©, chaque ligne de liste une icÃƒÂ´ne de tÃƒÂªte (+ ChevronRight vers un dÃƒÂ©tail), chaque ÃƒÂ©tat vide une grande icÃƒÂ´ne muette, chaque onglet une icÃƒÂ´ne. IcÃƒÂ´nes dÃƒÂ©coratives en aria-hidden, lisibilitÃƒÂ© mobile prÃƒÂ©servÃƒÂ©e. (B) Briques d\'UI mutualisÃƒÂ©es (DRY) : EauStatCard, EauIconButton, EauEmptyState, EauListIcon (components/EauUi.tsx) + icÃƒÂ´ne optionnelle sur EauTabs. (C) Graphiques pertinents (recharts, charte AHUVI) : tableau de bord (mini-conso 30 j + niveau du bassin), saisie bassin (courbe du niveau + histogramme du dÃƒÂ©bit des pompes), dÃƒÂ©tail compteur (histogramme de conso par pÃƒÂ©riode), facturation (barres conso et montant facturÃƒÂ© par pÃƒÂ©riode), espace client (historique conso conservÃƒÂ©), tendances (5 graphiques vÃƒÂ©rifiÃƒÂ©s). Ãƒâ€°tats vides illustrÃƒÂ©s partout. Ãƒâ€°volution 100 % additive et cosmÃƒÂ©tique (aucune logique mÃƒÂ©tier, aucun service, aucune signature modifiÃƒÂ©s ; aucun SQL). tsc --noEmit OK, build OK, 97 tests eau verts.',
    changes: [
      'Nouveau components/EauUi.tsx : EauStatCard (KPI icÃƒÂ´ne+conteneur teintÃƒÂ© AHUVI), EauIconButton (bouton ÃƒÂ  icÃƒÂ´ne, variantes primary/secondary/danger/ghost/gold), EauEmptyState (ÃƒÂ©tat vide grande icÃƒÂ´ne), EauListIcon (pastille de tÃƒÂªte de ligne)',
      'EauTabs : prop optionnelle `icon` (lucide) sur chaque onglet',
      'Iconographie + recolorisation AHUVI appliquÃƒÂ©es ÃƒÂ  tous les ÃƒÂ©crans : Dashboard, RelevÃƒÂ©s, Saisie compteur/bassin, TournÃƒÂ©e, Scan/QR, Suivi (Anomalies/Tendances), Compteurs, Carte, Facturation, Config, Utilisateurs, Demandes, Annonces, Audit, Alertes, Rapports, Client, Accueil',
      'Graphiques : niveau du bassin (Dashboard + Saisie bassin), historique du dÃƒÂ©bit pompes (barres), histogramme conso/compteur (dÃƒÂ©tail), barres conso+montant facturÃƒÂ©/pÃƒÂ©riode (Facturation)',
      'Spinners route guards (GestionEauRoute, EauRoleProtectedRoute) recolorÃƒÂ©s skyÃ¢â€ â€™ahuvi',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.23.0',
    date: '2026-06-05',
    description: 'Ãƒâ€°VOLUTION Ã‚Â« Aide contextuelle Ã‚Â» du module gestion-eau : chaque ÃƒÂ©cran et chaque action explique Ã‚Â« ÃƒÂ  quoi ÃƒÂ§a sert Ã‚Â» et Ã‚Â« comment s\'en servir Ã‚Â» via un panneau d\'aide dÃƒÂ©pliable, pour des utilisateurs non techniques. (A) Nouveau composant rÃƒÂ©utilisable EauAide : bouton Ã¢â€œËœ Ã‚Â« Aide Ã‚Â» discret prÃƒÂ¨s du titre + sous-titre cliquable, qui dÃƒÂ©plient/replient un panneau structurÃƒÂ© (Ãƒâ‚¬ quoi ÃƒÂ§a sert / Comment s\'en servir). Accessible (aria-expanded, aria-controls, focus), charte AHUVI (vert/or, fond clair), mobile-first. Ãƒâ€°tat mÃƒÂ©morisÃƒÂ© par ÃƒÂ©cran en localStorage (eau_aide_<id>) : repliÃƒÂ© par dÃƒÂ©faut, sauf 1ÃŠÂ³Ã¡Âµâ€° visite (dÃƒÂ©pliÃƒÂ©). (B) Aide branchÃƒÂ©e sur TOUS les ÃƒÂ©crans/onglets : Tableau de bord, RelevÃƒÂ©s (gÃƒÂ©nÃƒÂ©ral), Saisie bassin (aide PAR onglet : EntrÃƒÂ©e / Niveau / DÃƒÂ©bit), Saisie compteur, TournÃƒÂ©e, Scan, Suivi (Anomalies / Tendances), Compteurs, Carte, Facturation, Configuration, Utilisateurs, Demandes, Annonces, Audit, Centre d\'alertes, Rapports, Espace client, Page d\'accueil. (C) IntÃƒÂ©gration via prop `aide` de EauPageShell (bouton + sous-titre + panneau, ÃƒÂ©tat unique partagÃƒÂ©) pour les ÃƒÂ©crans ÃƒÂ  shell, et composant EauAide autonome pour les emplacements hors shell (bandeau RelevÃƒÂ©s, onglet Scan, onglets bassin, TournÃƒÂ©e, Carte, Accueil). Textes centralisÃƒÂ©s (eauAideTextes.ts). Ãƒâ€°volution 100 % additive (aucune rÃƒÂ©gression, aucun SQL). 5 tests ajoutÃƒÂ©s (rendu, 1ÃŠÂ³Ã¡Âµâ€° visite dÃƒÂ©pliÃƒÂ©e, mÃƒÂ©morisation repli, toggle + persistance, couverture du catalogue).',
    changes: [
      'Nouveau composant components/EauAide.tsx (hook useAideState + AideToggleButton + AidePanel + EauAide autonome)',
      'Nouveau catalogue components/eauAideTextes.ts (22 entrÃƒÂ©es d\'aide, franÃƒÂ§ais simple)',
      'EauPageShell : prop optionnelle `aide` (bouton Ã¢â€œËœ prÃƒÂ¨s du titre, sous-titre cliquable, panneau sous l\'en-tÃƒÂªte, ÃƒÂ©tat unique)',
      'Aide branchÃƒÂ©e sur tous les ÃƒÂ©crans ÃƒÂ  shell (Dashboard, SaisieCompteur, Anomalies, Tendances, Compteurs, Facturation, Config, Utilisateurs, Demandes, Annonces, Audit, Client, Alertes, Rapports)',
      'Aide autonome sur les ÃƒÂ©crans/onglets hors shell : RelevÃƒÂ©s (gÃƒÂ©nÃƒÂ©ral + Scan), Saisie bassin (EntrÃƒÂ©e/Niveau/DÃƒÂ©bit), TournÃƒÂ©e, Carte, Accueil',
      '5 tests RTL (eauAide.test.tsx) : rendu, 1ÃŠÂ³Ã¡Âµâ€° visite dÃƒÂ©pliÃƒÂ©e, mÃƒÂ©morisation du repli, toggle + persistance localStorage, couverture du catalogue',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.22.0',
    date: '2026-06-05',
    description: 'Ãƒâ€°VOLUTION Ã‚Â« bassin/dÃƒÂ©bit Ã‚Â» du module gestion-eau (modÃƒÂ¨le physique affinÃƒÂ© + mesure de l\'apport). (A) ModÃƒÂ¨le bassin flotteur/trop-plein : la Configuration saisit dÃƒÂ©sormais Longueur, Largeur, Hauteur flotteur (arrÃƒÂªt pompes Ã¢â‚¬â€ plafond opÃƒÂ©rationnel, rÃƒÂ©fÃƒÂ©rence du % de remplissage) et Hauteur trop-plein (sÃƒÂ©curitÃƒÂ©) + ÃƒÂ©cart dÃƒÂ©bit max (%). DÃƒÂ©ductions centralisÃƒÂ©es et affichÃƒÂ©es en lecture seule : surface S = LÃƒâ€”l, volume utile = SÃƒâ€”Hf, volume sÃƒÂ©curitÃƒÂ© = SÃƒâ€”Htp, mÃ‚Â³/cm = SÃƒâ€”0,01 (ex. 14Ãƒâ€”7Ãƒâ€”2,50 Ã¢â€ â€™ 98 mÃ‚Â², 245 mÃ‚Â³, 0,98 mÃ‚Â³/cm ; trop-plein 2,90 Ã¢â€ â€™ 284,2 mÃ‚Â³). (B) Tests de dÃƒÂ©bit des pompes Ã‚Â« vanne fermÃƒÂ©e Ã‚Â» (RelevÃƒÂ©s Ã¢â€ â€™ onglet Bassin Ã¢â€ â€™ mode DÃƒÂ©bit) : niveau dÃƒÂ©but/fin (cm) + durÃƒÂ©e (min) Ã¢â€ â€™ Q_in (mÃ‚Â³/h) = S Ãƒâ€” (ÃŽâ€niveau/100) ÃƒÂ· (durÃƒÂ©e/60) ; historique des tests + dÃƒÂ©bit courant (dernier) mis en ÃƒÂ©vidence ; ÃƒÂ©cart % vs prÃƒÂ©cÃƒÂ©dent ; alerte Ã‚Â« dÃƒÂ©bit instable Ã‚Â» si ÃƒÂ©cart > seuil (dÃƒÂ©f. 15 %). Nouvelle table eau_debit_tests. (C) Conso rÃƒÂ©seau & pertes recalculÃƒÂ©es : apport = Q_inÃƒâ€”ÃŽâ€t (ou volume manuel en override) ; conso rÃƒÂ©seau = apport Ã¢Ë†â€™ ÃŽâ€stock ; pertes = conso rÃƒÂ©seau Ã¢Ë†â€™ ÃŽÂ£ compteurs ; NRW = pertes / conso rÃƒÂ©seau. Bilans enrichis (apport_m3, conso_reseau_m3, pertes_m3, debit_m3h_utilise). (D) Autonomie estimÃƒÂ©e = stock courant ÃƒÂ· conso horaire moyenne (+ date de vidage prÃƒÂ©vue), conso moyenne/jour. (E) Tableau de bord : cartes DÃƒÂ©bit courant, Conso rÃƒÂ©seau, NRW (modÃƒÂ¨le rÃƒÂ©seau), Autonomie ; % remplissage rÃƒÂ©fÃƒÂ©rencÃƒÂ© au flotteur. (F) Alertes ajoutÃƒÂ©es : Ã‚Â« flotteur dÃƒÂ©faillant Ã‚Â» (niveau mesurÃƒÂ© > flotteur Ã¢â€ â€™ risque dÃƒÂ©bordement) et Ã‚Â« dÃƒÂ©bit instable Ã‚Â» Ã¢â‚¬â€ via le centre d\'alertes + notificationService existants. RÃƒÂ©trocompatible : sans test de dÃƒÂ©bit, repli automatique sur la saisie manuelle d\'entrÃƒÂ©es (aucune casse). Offline-first (Dexie v2) + sync idempotente (id client, upsert). 15 tests ajoutÃƒÂ©s (107 tests eau au total).',
    changes: [
      'Nouveaux utils purs : utils/debit.ts (computeDebit/ecartDebitPct/debitInstable) ; utils/bassin.ts ÃƒÂ©tendu (BassinModel, bassinDeductions, tauxRemplissageFlotteur, estimerAutonomie)',
      'utils/bilan.ts : computeBilan calcule apport/conso rÃƒÂ©seau/pertes/NRW rÃƒÂ©seau (additif, rÃƒÂ©trocompatible) ; utils/alertes.ts : candidat flotteur_defaillant',
      'Nouveau service central eauBassinService (source unique des dÃƒÂ©ductions bassin + CRUD tests de dÃƒÂ©bit + alerte dÃƒÂ©bit instable)',
      'eauBilanService : bilan alimentÃƒÂ© par le dÃƒÂ©bit courant + champs rÃƒÂ©seau persistÃƒÂ©s ; DashboardData enrichi (dÃƒÂ©bit, conso rÃƒÂ©seau, NRW rÃƒÂ©seau, autonomie)',
      'eauConfigService : dimensionsFromConfig rÃƒÂ©fÃƒÂ©rence le flotteur (repli hauteur max) ; debitEcartMaxPctFromConfig',
      'eauAlerteService : flotteur dÃƒÂ©faillant alimentÃƒÂ© (hauteur derniÃƒÂ¨re vs flotteur) + titres des 2 nouveaux types',
      'UI : EauConfigPage (flotteur/trop-plein/ÃƒÂ©cart dÃƒÂ©bit + dÃƒÂ©ductions lecture seule), EauSaisieBassinPage (onglet DÃƒÂ©bit : saisie/aperÃƒÂ§u Q_in + historique), EauDashboard (cartes dÃƒÂ©bit/conso rÃƒÂ©seau/autonomie), EauAlertesPage (libellÃƒÂ©s)',
      'Types/Dexie : eau_debit_tests (table v2) + champs eau_config (flotteur/trop-plein/ÃƒÂ©cart) + eau_bilans (apport/conso rÃƒÂ©seau/pertes/dÃƒÂ©bit) + AlerteType (flotteur_defaillant, debit_instable)',
      'SQL : ALTER eau_config (3 colonnes), CREATE eau_debit_tests (+ RLS), ALTER eau_bilans (4 colonnes), ÃƒÂ©largissement du check des types eau_alertes',
      '15 tests ajoutÃƒÂ©s (dÃƒÂ©ductions bassin, Q_in, conso rÃƒÂ©seau/pertes/NRW, autonomie, alerte flotteur) Ã¢â‚¬â€ 107 tests eau',
    ],
    type: 'minor' as const,
  },
  {
    version: '3.21.0',
    date: '2026-06-04',
    description: 'PHASE 4 du module gestion-eau (pilotage & finitions + charte AHUVI). (A) Tendances /gestion-eau/tendances (admin+releveur) : graphiques recharts Ã¢â‚¬â€ conso mÃƒÂ©trÃƒÂ©e par jour (aire), niveau du bassin (ligne), NRW par semaine (barres), top consommateurs et conso par zone (barres horizontales) ; mini-graphe conso 30 j au tableau de bord (lien Tendances) ; onglet Tendances activÃƒÂ© sous Suivi ; historique de consommation (12 derniers relevÃƒÂ©s) dans l\'espace client. (B) Centre d\'alertes /gestion-eau/alertes (admin) : gÃƒÂ©nÃƒÂ©ration IDEMPOTENTE (anomalie de bilan, compteur non relevÃƒÂ© > jours_sans_releve_alerte, bassin critique < bassin_seuil_critique_pct, fuite suspectÃƒÂ©e si NRW Ã¢â€°Â¥ 25 % + pertes > 0) ; dÃƒÂ©dup par type+ref non traitÃƒÂ© ; notifications sur l\'appareil via le notificationService partagÃƒÂ© (type eau_alert) ; marquage lu/traitÃƒÂ© ; bouton Ã‚Â« Activer Ã‚Â» les notifications. (C) Rapport mensuel /gestion-eau/rapports (admin) : synthÃƒÂ¨se (entrÃƒÂ©es, conso, pertes/NRW, anomalies, factures + impayÃƒÂ©) Ã¢â€ â€™ PDF (jsPDF, charte verte) ; proposition automatique en fin de pÃƒÂ©riode (derniers/premiers jours du mois, mÃƒÂ©morisÃƒÂ©e). (D) Annonces /gestion-eau/annonces (admin) : CRUD (titre, texte, type promo/ÃƒÂ©vÃƒÂ¨nement/communautÃƒÂ©, fenÃƒÂªtre date, actif) ; les annonces actives dÃƒÂ©filent dans un bandeau fermable du header en mode eau. (E) Journal d\'audit /gestion-eau/audit (admin) : actions clÃƒÂ©s journalisÃƒÂ©es (config modifiÃƒÂ©e, factures gÃƒÂ©nÃƒÂ©rÃƒÂ©es, annonces CRUD) + journal des scans QR (Phase 3), filtre texte, 2 onglets. (F) Charte AHUVI : palette/typo dÃƒÂ©jÃƒÂ  en place, ÃƒÂ©tendue (tokens ahuvi.gold-light #C3C067, ahuvi.teal #10939F) ; ÃƒÂ©crans Phase 4 stylÃƒÂ©s (vert forÃƒÂªt/olive/or, Playfair/Poppins) ; aucun autre module affectÃƒÂ©. Reprises Phase 3 : photo de relevÃƒÂ© compteur (capture camÃƒÂ©ra + compression JPEG locale, stockÃƒÂ©e en data URL via la file _dirty), bouton Ã‚Â« Purger le cache carte Ã‚Â» (countTiles/clearTiles) en Configuration, badge Ã‚Â« N en attente de sync Ã‚Â» (countDirty) dans le menu header. Menu HeaderEauActions : Tendances/Alertes/Rapports/Annonces/Audit activÃƒÂ©es (role-filtrÃƒÂ©es) + badge alertes non lues. Aucun SQL (tables eau_alertes/eau_audit/eau_annonces + colonnes dÃƒÂ©jÃƒÂ  prÃƒÂ©sentes).',
    changes: [
      'Nouveaux services : eauAlerteService (gÃƒÂ©nÃƒÂ©ration idempotente + notifs), eauAnnonceService (CRUD + fenÃƒÂªtre active), eauAuditService (logAudit/listAudit), eauTendanceService (sÃƒÂ©ries conso/niveau/NRW/top/zone), eauRapportService (synthÃƒÂ¨se mensuelle + proposition fin de pÃƒÂ©riode)',
      'Nouvel util pur testable : utils/alertes.ts (computeAlerteCandidates) ; utils/rapportPdf.ts (PDF mensuel) ; utils/photo.ts (compression image)',
      'Nouveaux ÃƒÂ©crans : EauTendancesPage, EauAlertesPage, EauRapportsPage, EauAnnoncesPage, EauAuditPage + routes role-gardÃƒÂ©es',
      'EauSuiviPage : onglet Tendances activÃƒÂ© ; EauDashboard : mini-graphe conso 30 j ; EauClientPage : historique conso ; EauSaisieCompteurPage : capture photo ; EauConfigPage : purge cache carte',
      'PARTAGÃƒâ€° Header.tsx : bandeau d\'annonces dÃƒÂ©filant (HeaderEauAnnonces) en mode eau',
      'PARTAGÃƒâ€° header/HeaderEauActions.tsx : entrÃƒÂ©es Phase 4 activÃƒÂ©es + badges (alertes non lues, file _dirty)',
      'PARTAGÃƒâ€° notificationService.ts : type eau_alert ajoutÃƒÂ© (additif)',
      'PARTAGÃƒâ€° tailwind.config.js : tokens ahuvi.gold-light + ahuvi.teal',
      'eauSync.countDirty() ; hooks d\'audit additifs dans eauConfigService.saveConfig et eauFactureService.genererFactures',
      '20 tests Phase 4 (alertes, annonces, tendances, NRW, rapport) Ã¢â‚¬â€ 77 tests eau au total',
    ],
    type: 'minor' as const
  },
  {
    version: '3.20.0',
    date: '2026-06-04',
    description: 'PHASE 3 du module gestion-eau (QR & terrain). (A) QR compteur : un compteur peut porter PLUSIEURS QR (eau_qr_compteur), chacun avec un libellÃƒÂ© d\'emplacement et un code unique ; QR encode Ã¢â‚¬Â¦/gestion-eau/scan?t=c&k=<code> ; export JPEG par QR + page d\'ÃƒÂ©tiquettes imprimable (HTML). QR client : un par compte (code_qr), encode t=cl, tÃƒÂ©lÃƒÂ©chargeable JPEG (onglet Ã‚Â« Mon QR Ã‚Â»). (B) Route de scan publique /gestion-eau/scan : rÃƒÂ©sout selon connexion + rÃƒÂ´le et JOURNALISE dans eau_scans (emplacement, utilisateur, rÃƒÂ´le, rÃƒÂ©sultat) Ã¢â‚¬â€ releveur/admin + QR compteur Ã¢â€ â€™ saisie d\'index directe du bon compteur (prÃƒÂ©selection) ; releveur/admin + QR client Ã¢â€ â€™ fiche conso du client ; client + son QR Ã¢â€ â€™ son espace ; client + autre QR Ã¢â€ â€™ Ã‚Â« Ce QR ne vous est pas destinÃƒÂ© Ã‚Â» ; non connectÃƒÂ©/sans rÃƒÂ´le Ã¢â€ â€™ page mission. Scanner camÃƒÂ©ra intÃƒÂ©grÃƒÂ© (html5-qrcode) en onglet Scan + bouton sur la saisie compteur. Journal des scans par compteur visible dans le gestionnaire QR (admin). (C) Mode tournÃƒÂ©e (/releves onglet TournÃƒÂ©e) : compteurs ordonnÃƒÂ©s zone/ordre, progression X/N des relevÃƒÂ©s du jour, reprise au 1er non relevÃƒÂ©, sÃƒÂ©lection Ã¢â€ â€™ saisie directe. (D) Carte hors-ligne (compteurs onglet Carte) : Leaflet + tuiles OSM, gÃƒÂ©oloc lat/lng ÃƒÂ©ditable en fiche compteur, bouton Ã‚Â« TÃƒÂ©lÃƒÂ©charger la carte de la zone Ã‚Â» qui prÃƒÂ©-tÃƒÂ©lÃƒÂ©charge les tuiles de la zone configurÃƒÂ©e (eau_config.map_centre_lat/lng, map_rayon_km, map_zoom_min/max) dans un cache IndexedDB dÃƒÂ©diÃƒÂ© (GestionEauTilesDB, hors sync, plafonnÃƒÂ© ÃƒÂ  1500 tuiles Ã¢â‚¬â€ politique OSM) ; auto au 1er lancement en ligne ; repli sur la liste des compteurs si tuile manquante hors-ligne. Champs Ã‚Â« Zone carte Ã‚Â» ajoutÃƒÂ©s en Configuration. (E) DÃƒÂ©clencheur de sync au retour online (ÃƒÂ©coute useAppStore.isOnline) : vide la file _dirty (relevÃƒÂ©s, compteurs, QR, scans crÃƒÂ©ÃƒÂ©s hors-ligne) via upsert idempotent (id client) Ã¢â€ â€™ aucun doublon. Nettoyage : EauNav.tsx + navConfig.ts supprimÃƒÂ©s (nav principale = GESTION_EAU_NAV_ITEMS), test eauNavRoles migrÃƒÂ©. DÃƒÂ©pendances ajoutÃƒÂ©es : qrcode, html5-qrcode, leaflet (+ types). Tables eau_qr_compteur/eau_scans + colonnes lat/lng/map_* dÃƒÂ©jÃƒÂ  prÃƒÂ©sentes cÃƒÂ´tÃƒÂ© Supabase (aucun SQL).',
    changes: [
      'Nouveaux utils : scanUrl.ts (encode/dÃƒÂ©code liens QR), qrImage.ts (export JPEG + ÃƒÂ©tiquettes imprimables)',
      'Nouveaux services : eauQrService (CRUD multi-QR compteur), eauScanService (rÃƒÂ©solution matrice rÃƒÂ´le + journalisation, decideOutcome pur), eauTourneeService (progression du jour)',
      'Nouvelle base locale dÃƒÂ©diÃƒÂ©e : db/eauTiles.ts (cache tuiles OSM, NON synchronisÃƒÂ©)',
      'Nouvelle couche carte : components/map/offlineTiles.ts (OfflineTileLayer + downloadZoneTiles bornÃƒÂ©e ÃƒÂ  la zone)',
      'Nouveaux ÃƒÂ©crans : EauScanResolverPage (route publique /gestion-eau/scan), EauQrScanner (camÃƒÂ©ra), EauQrCompteurManager (QR + journal), EauTourneePage, EauCartePage, EauClientQrPage',
      'Onglets activÃƒÂ©s : TournÃƒÂ©e + Scan (EauRelevesPage), Carte (EauCompteursPage), Mon QR (EauClientPage)',
      'PARTAGÃƒâ€° App.tsx : route publique /gestion-eau/scan',
      'eauCompteurService/EauCompteursPage : gÃƒÂ©oloc lat/lng ÃƒÂ©ditable + bouton QR par compteur',
      'EauConfigPage : section Ã‚Â« Zone carte Ã‚Â» (centre/rayon/zoom)',
      'GestionEauContext : dÃƒÂ©clencheur syncAll() au retour en ligne (vide _dirty)',
      'Suppression EauNav.tsx + navConfig.ts ; test eauNavRoles migrÃƒÂ© vers GESTION_EAU_NAV_ITEMS ; 16 tests Phase 3 ajoutÃƒÂ©s (scanUrl, decideOutcome, tiles)',
    ],
    type: 'minor' as const
  },
  {
    version: '3.19.0',
    date: '2026-06-04',
    description: 'CORRECTIF UI du module gestion-eau (constatÃƒÂ© en prod v3.18.0). (a) La barre du bas (BottomNav) affichait encore les 6 items BazarKELY en module Eau et le module avait une nav interne en doublon (EauNav). (b) Le header partagÃƒÂ© restait Ã‚Â« BazarKELY Ã‚Â» et un second header (titre/sous-titre) s\'affichait dans la page. DÃƒÂ©sormais : UN SEUL header, brandÃƒÂ© AHUVI (palette vert forÃƒÂªt #364E30 / olive #4C6D40 + accent or #9D9B4B, titres Playfair Display, texte Poppins, Ã‚Â« AHUVI Eau Ã‚Â» + slogan Ã‚Â« Distribution & suivi d\'eau Ã¢â‚¬â€ Nosy Be Ã‚Â»), conditionnÃƒÂ© par le module (bazarkely violet et construction inchangÃƒÂ©s). La nav PRINCIPALE vit dans BottomNav (mobile) + nav desktop du header : boutons THÃƒâ€°MATIQUES (Ã¢â€°Â¤ 6) filtrÃƒÂ©s par rÃƒÂ´le Ã¢â‚¬â€ Admin (5 : Tableau de bord Ã‚Â· RelevÃƒÂ©s Ã‚Â· Suivi Ã‚Â· Compteurs Ã‚Â· Facturation), Releveur (3 : Tableau de bord Ã‚Â· RelevÃƒÂ©s Ã‚Â· Suivi), Client (2 : Ma conso Ã‚Â· Mes factures). Chaque thÃƒÂ¨me regroupe ses sous-ÃƒÂ©crans via des onglets internes (RelevÃƒÂ©s = Bassin/Compteur ; Suivi = Anomalies/Bilans ; Compteurs = Liste/Carte ; Facturation = Factures/Rapports ; Client = Ma conso/Mes factures). Le secondaire (Configuration, Utilisateurs & rÃƒÂ´les, Demandes d\'accÃƒÂ¨s, + Alertes/Annonces/Audit Phase 3-4) passe dans un menu en haut ÃƒÂ  droite (HeaderEauActions), filtrÃƒÂ© par rÃƒÂ´le. MATRICE D\'ACCÃƒË†S appliquÃƒÂ©e ÃƒÂ  3 niveaux : gardes EauRoleProtectedRoute sur chaque route (redirection role-aware sans boucle : un client refusÃƒÂ© atterrit sur son espace), filtrage de nav (footer + desktop + menu), scoping des donnÃƒÂ©es client (compteurs assignÃƒÂ©s, inchangÃƒÂ©). EauPageShell ne rend plus de seconde barre ni de gros en-tÃƒÂªte.',
    changes: [
      'PARTAGÃƒâ€° tailwind.config.js : namespace couleurs `ahuvi` + fontFamily ahuvi-display/ahuvi-body (utilisÃƒÂ©s uniquement en mode eau)',
      'PARTAGÃƒâ€° src/index.css : import Google Fonts Playfair Display + Poppins',
      'PARTAGÃƒâ€° constants/index.ts : GESTION_EAU_NAV_ITEMS (boutons-thÃƒÂ¨mes + rÃƒÂ´les)',
      'PARTAGÃƒâ€° BottomNav.tsx : branche gestion-eau (items role-filtrÃƒÂ©s, Ã¢â€°Â¤ 6, thÃƒÂ¨me vert AHUVI actif)',
      'PARTAGÃƒâ€° Header.tsx : branche isEauModule (fond AHUVI, titre/slogan, nav desktop role-filtrÃƒÂ©e, HeaderEauActions, banniÃƒÂ¨re/quiz/level masquÃƒÂ©s)',
      'Nouveau header/HeaderEauActions.tsx : menu secondaire role-filtrÃƒÂ© (Config, Utilisateurs, Demandes ; Alertes/Annonces/Audit = bientÃƒÂ´t ; dÃƒÂ©connexion + version)',
      'Nouveaux ÃƒÂ©crans-thÃƒÂ¨mes : EauRelevesPage, EauSuiviPage + composant EauTabs (onglets internes)',
      'EauCompteursPage / EauFacturationPage / EauClientPage : onglets internes (Liste/Carte ; Factures/Rapports ; Ma conso/Mes factures)',
      'EauPageShell : suppression de EauNav + du gros en-tÃƒÂªte (titre de section discret only)',
      'GestionEauRoutes : routes /releves /suivi /client/:tab + gardes de rÃƒÂ´le sur toutes les routes + redirections anciennes routes',
      'EauRoleProtectedRoute : redirection role-aware (home calculÃƒÂ©) sans boucle',
    ],
    type: 'minor' as const
  },
  {
    version: '3.18.2',
    date: '2026-06-04',
    description: 'Fix gestion-eau (dÃƒÂ©couvert en validation connectÃƒÂ©e) : les confirmations utilisaient window.confirm(), NEUTRALISÃƒâ€° globalement par dialogService (override qui logue un warning et renvoie undefined, sans dialogue cliquable). ConsÃƒÂ©quence : Ã‚Â« Refuser Ã‚Â» une demande d\'accÃƒÂ¨s, Ã‚Â« Supprimer Ã‚Â» un compteur, retirer son propre rÃƒÂ´le admin, et confirmer une rupture/relevÃƒÂ© aberrant ne dÃƒÂ©clenchaient JAMAIS l\'action (le if(!confirm) return sortait toujours). Remplacement des 5 window.confirm du module par showConfirm() (modal asynchrone propre de l\'app, dialogUtils). MÃƒÂªme piÃƒÂ¨ge que v3.16.2.',
    changes: [
      'EauDemandesPage (Refuser), EauCompteursPage (Supprimer), EauUtilisateursPage (retrait auto-admin), EauSaisieCompteurPage (rupture + aberrant) : window.confirm Ã¢â€ â€™ await showConfirm',
    ],
    type: 'patch' as const
  },
  {
    version: '3.18.1',
    date: '2026-06-04',
    description: 'Fix gestion-eau (dÃƒÂ©couvert en validation connectÃƒÂ©e) : le GestionEauProvider rechargeait avec un spinner BLOQUANT ÃƒÂ  chaque bascule online/offline (isOnline dans ses deps) Ã¢â€ â€™ sur rÃƒÂ©seau instable (cas Madagascar), les ÃƒÂ©crans du module se dÃƒÂ©montaient/remontaient en boucle, faisant flasher l\'UI et PERDRE la saisie en cours (config, pÃƒÂ©riode de facturation, formulaires). DÃƒÂ©sormais le spinner ne s\'affiche qu\'au TOUT PREMIER chargement (initialLoadDoneRef) ; les rechargements suivants (changement de statut rÃƒÂ©seau ou de session) se font en arriÃƒÂ¨re-plan sans dÃƒÂ©monter les ÃƒÂ©crans.',
    changes: [
      'GestionEauContext : load(showSpinner) + initialLoadDoneRef Ã¢â€ â€™ plus de spinner bloquant sur les rechargements dÃƒÂ©clenchÃƒÂ©s par isOnline/login',
    ],
    type: 'patch' as const
  },
  {
    version: '3.18.0',
    date: '2026-06-04',
    description: 'PHASE 2 du module gestion-eau : FACTURATION & CLIENTS. Facturation (admin /gestion-eau/facturation) : choix d\'une pÃƒÂ©riode Ã¢â€ â€™ une facture numÃƒÂ©rotÃƒÂ©e par compteur actif (indexDÃƒÂ©but = dernier relevÃƒÂ© Ã¢â€°Â¤ dÃƒÂ©but, indexFin = dernier relevÃƒÂ© Ã¢â€°Â¤ fin, conso = indexFin Ã¢Ë†â€™ indexDÃƒÂ©but, montant = conso Ãƒâ€” tarifM3 en Ariary/MGA) ; numÃƒÂ©rotation sÃƒÂ©quentielle via eau_config.numero_facture_seq (F-000001Ã¢â‚¬Â¦), statut payÃƒÂ©/impayÃƒÂ© modifiable, date d\'ÃƒÂ©chÃƒÂ©ance, relances ; export PDF par facture (en-tÃƒÂªte copro + logo, jspdf) + export CSV global (relevÃƒÂ©s + bilans + factures) ; gÃƒÂ©nÃƒÂ©ration idempotente (skip si dÃƒÂ©jÃƒÂ  facturÃƒÂ© sur la pÃƒÂ©riode exacte ou aucun relevÃƒÂ© exploitable). CONFIG OBLIGATOIRE (dÃƒÂ©cision JOEL) : suppression de TOUS les seuils par dÃƒÂ©faut Ã¢â‚¬â€ la facturation ET le calcul d\'anomalies sont bloquÃƒÂ©s (Ã‚Â« Configurer d\'abord Ã‚Â») tant que la config n\'est pas complÃƒÂ¨te (dimensions bassin, tarifM3, seuilPct, seuilM3, facteur aberrant, pÃƒÂ©riode). Comptes clients (admin /gestion-eau/utilisateurs) : dÃƒÂ©signation immÃƒÂ©diate Administrateur/Releveur (eau_roles), crÃƒÂ©ation d\'un compte client (nom, contact, compteurs visibles) Ã¢â€ â€™ code d\'enrÃƒÂ´lement unique gÃƒÂ©nÃƒÂ©rÃƒÂ©/affichÃƒÂ©. Page mission PUBLIQUE /gestion-eau/accueil (hors garde d\'auth) : prÃƒÂ©sentation, installation PWA (beforeinstallprompt Android/Chrome + instructions iOS), Ã‚Â« J\'ai un code Ã‚Â» (Google + code Ã¢â€ â€™ liaison compte client, user_id + actif=true) et Ã‚Â« Demander un accÃƒÂ¨s Ã‚Â» (Google Ã¢â€ â€™ eau_demandes_acces en_attente) ; intention mÃƒÂ©morisÃƒÂ©e avant la redirection Google puis traitÃƒÂ©e au retour par GestionEauProvider. Demandes d\'accÃƒÂ¨s (admin /gestion-eau/demandes) : valider (rÃƒÂ´les + compteurs visibles) ou refuser. Espace client (/gestion-eau/client) : conso + factures tÃƒÂ©lÃƒÂ©chargeables des SEULS compteurs assignÃƒÂ©s. Offline-first + sync idempotente inchangÃƒÂ©es. +19 tests (facturation/montants, numÃƒÂ©rotation, config complÃƒÂ¨te, filtrage compteurs client, codes d\'enrÃƒÂ´lement, CSV) Ã¢â€ â€™ 40 tests module.',
    changes: [
      'Nouveaux services : eauFactureService, eauCompteClientService, eauDemandeService, eauEnrollmentService (+ fetchUserDirectory dans eauRoleService)',
      'Nouveaux ÃƒÂ©crans : EauFacturationPage, EauUtilisateursPage, EauDemandesPage, EauClientPage, EauAccueilPage (publique)',
      'Nouveaux utils : facture.ts (calcul ligne + numÃƒÂ©rotation + complÃƒÂ©tude config + filtrage), codes.ts, csv.ts, pdf.ts (jspdf), pwa.ts',
      'eauConfigService : suppression des seuils par dÃƒÂ©faut (anomalies bloquÃƒÂ©es tant que config incomplÃƒÂ¨te) + isConfigComplete/configMissingFields',
      'PARTAGÃƒâ€° App.tsx : route publique /gestion-eau/accueil (hors AppLayout/auth)',
      'navConfig + GestionEauRoutes : routes facturation/utilisateurs/demandes/client + GestionEauContext traite l\'enrÃƒÂ´lement au retour Google',
    ],
    type: 'minor' as const
  },
  {
    version: '3.17.0',
    date: '2026-06-04',
    description: 'PHASE 1 du module gestion-eau (copropriÃƒÂ©tÃƒÂ© : distribution de l\'eau d\'un bassin ~280 mÃ‚Â³ vers villas/golf/communs). Socle complet : intÃƒÂ©gration au Module Switcher (dÃƒÂ©tection ÃƒÂ©tendue /gestion-eau sans casser construction/bazarkely), rÃƒÂ´les cumulables admin/releveur/client (bootstrap Ã‚Â« premier admin = propriÃƒÂ©taire Ã‚Â» dans eau_roles) + gardes de route (GestionEauRoute / EauRoleProtectedRoute), navigation interne filtrÃƒÂ©e par rÃƒÂ´le. Ãƒâ€°crans : Tableau de bord (stock + % remplissage, entrÃƒÂ©es/conso du jour, dernier bilan, NRW), Configuration (admin : dimensions bassin, tarif, seuils), Saisie bassin (entrÃƒÂ©e mÃ‚Â³ ; niveau cm Ã¢â€ â€™ mÃ‚Â³ = LÃƒâ€”lÃƒâ€”(h/100), bloquÃƒÂ© si bassin non configurÃƒÂ©, dÃƒÂ©clenche un bilan), Saisie compteur (recherche/liste par zone, conso = index Ã¢Ë†â€™ prÃƒÂ©cÃƒÂ©dent, rupture si index<, dÃƒÂ©tection aberrant confirmable), CRUD compteurs, Anomalies (liste des bilans + filtre + marquer traitÃƒÂ©e). Moteur de bilan Ã‚Â« par relevÃƒÂ© en continu Ã‚Â» : stockAttendu = stockPrev + entrÃƒÂ©es Ã¢Ë†â€™ conso ; anomalie si |ÃƒÂ©cart|>seuilM3 OU ÃƒÂ©cart%>seuilPct ; NRW = (entrÃƒÂ©esÃ¢Ë†â€™conso)/entrÃƒÂ©es. Offline-first : base Dexie DÃƒâ€°DIÃƒâ€°E GestionEauDB (15 stores eau_*, additif Ã¢â‚¬â€ zÃƒÂ©ro migration sur BazarKELYDB), sync Supabase idempotente (upsert id client, onConflict, jamais getUser()). 21 tests unitaires (conversion/bilan/conso/NRW/aberrant/filtrage rÃƒÂ´les).',
    changes: [
      'Nouveau module frontend/src/modules/gestion-eau/ (types, db, services, context, components, utils, tests)',
      'PARTAGÃƒâ€° App.tsx : montage global de GestionEauProvider',
      'PARTAGÃƒâ€° components/Layout/AppLayout.tsx : route /gestion-eau/* (GestionEauRoute + GestionEauRoutes)',
      'PARTAGÃƒâ€° contexts/ModuleSwitcherContext.tsx : module gestion-eau dans DEFAULT_MODULES + dÃƒÂ©tection ÃƒÂ©tendue (moduleIdForPath)',
      'Nouveau SUPABASE-SQL.md (DDL de rÃƒÂ©fÃƒÂ©rence des 15 tables eau_*) + FONCTIONNEMENT-MODULES.md mis ÃƒÂ  jour',
    ],
    type: 'minor' as const
  },
  {
    version: '3.16.26',
    date: '2026-05-31',
    description: 'POINT 1 : unification du tiroir de dÃƒÂ©tail d\'un prÃƒÂªt entre la page PrÃƒÂªts (Famille) et la page Transactions. Nouveau composant partagÃƒÂ© components/Loans/LoanDetailPanel.tsx qui affiche EXACTEMENT le mÃƒÂªme contenu des deux cÃƒÂ´tÃƒÂ©s : bloc Montant (RemboursÃƒÂ© + barre de progression + trio "en direct" Capital Ã‚Â· IntÃƒÂ©rÃƒÂªts courus Ã‚Â· Total dÃƒÂ»), ligne d\'ÃƒÂ©chÃƒÂ©ance (jauge + compte ÃƒÂ  rebours + montant ÃƒÂ  percevoir/ÃƒÂ  payer), Notes (si prÃƒÂ©sentes), Informations (CatÃƒÂ©gorie + Devise) et Historique des remboursements. Les boutons d\'action restent propres ÃƒÂ  chaque page. La page Transactions n\'affiche le panneau que pour un prÃƒÂªt origine (loan/loan_received) ; les remboursements gardent leur affichage spÃƒÂ©cifique. NB : la ligne "Partage famille" du dÃƒÂ©tail prÃƒÂªt cÃƒÂ´tÃƒÂ© Transactions est retirÃƒÂ©e (non prÃƒÂ©sente cÃƒÂ´tÃƒÂ© Famille) pour un rendu identique.',
    changes: [
      'Nouveau components/Loans/LoanDetailPanel.tsx (panneau de dÃƒÂ©tail commun)',
      'LoansPage.tsx : corps du dÃƒÂ©tail remplacÃƒÂ© par <LoanDetailPanel> ; imports LoanLiveTrio/RepaymentHistorySection retirÃƒÂ©s',
      'TransactionsPage.tsx : <LoanDetailPanel> pour les prÃƒÂªts origine ; anciens blocs Montant/Notes/Informations masquÃƒÂ©s pour ces prÃƒÂªts',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.25',
    date: '2026-05-31',
    description: 'HOTFIX v3.16.24 : la page de modification d\'une transaction (TransactionDetailPage) plantait (ReferenceError: setDurationMonths is not defined) ÃƒÂ  cause d\'un appel orphelin setDurationMonths(\'\') restÃƒÂ© dans un useEffect de rÃƒÂ©initialisation aprÃƒÂ¨s le retrait de l\'ÃƒÂ©tat durationMonths. RemplacÃƒÂ© par setDueDateInput(\'\'). Ãƒâ‚¬ noter : `npm run build` (vite/esbuild) ne fait PAS de contrÃƒÂ´le de types strict Ã¢â‚¬â€ le garde-fou est `npx tsc --noEmit`, dÃƒÂ©sormais lancÃƒÂ© avant dÃƒÂ©ploiement.',
    changes: [
      'TransactionDetailPage.tsx : setDurationMonths Ã¢â€ â€™ setDueDateInput dans le useEffect de reset des champs prÃƒÂªt',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.24',
    date: '2026-05-31',
    description: 'Refonte de la saisie des termes d\'un prÃƒÂªt (crÃƒÂ©ation + modification). (POINT 2) L\'ÃƒÂ©chÃƒÂ©ance se saisit dÃƒÂ©sormais en DATE directe (sÃƒÂ©lecteur de date) au lieu d\'un nombre de mois Ã¢â‚¬â€ plus naturel entre proches ; la durÃƒÂ©e ÃƒÂ©quivalente (an/mois/jour) s\'affiche sous le champ. (POINT 3) L\'intÃƒÂ©rÃƒÂªt se saisit au choix en MONTANT (Ar) ou en %, et "par jour" ou "sur toute la durÃƒÂ©e", via 2 toggles (dÃƒÂ©faut : Ar Ã‚Â· sur la durÃƒÂ©e ÃƒÂ  la crÃƒÂ©ation) ; la valeur est convertie en taux JOURNALIER stockÃƒÂ© (le moteur ne change pas), avec affichage en direct de l\'ÃƒÂ©quivalent "% / jour". Briques partagÃƒÂ©es : services/loanTerms.ts (conversion, 10 tests) + components/Loans/LoanTermsFields.tsx (UI commune aux 2 pages). loanService : updateLoanInterestRate Ã¢â€ â€™ updateLoanTerms (taux + date d\'ÃƒÂ©chÃƒÂ©ance). En modification, le champ est prÃƒÂ©-rempli avec le taux journalier effectif (toggles % Ã‚Â· par jour) et la date d\'ÃƒÂ©chÃƒÂ©ance du prÃƒÂªt.',
    changes: [
      'Nouveau services/loanTerms.ts (computeDailyRatePct/daysBetweenDates/formatDurationLabel) + 10 tests',
      'Nouveau components/Loans/LoanTermsFields.tsx (date d\'ÃƒÂ©chÃƒÂ©ance + intÃƒÂ©rÃƒÂªt avec 2 toggles + ÃƒÂ©quivalent %/jour)',
      'AddTransactionPage.tsx + TransactionDetailPage.tsx : remplacement des champs taux+durÃƒÂ©e par LoanTermsFields ; conversion au submit',
      'loanService.ts : updateLoanTerms(id, dailyRate, dueDate?) remplace updateLoanInterestRate',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.23',
    date: '2026-05-31',
    description: 'Ãƒâ€°puration du tiroir de dÃƒÂ©tail (page Transactions). (1) Suppression de l\'en-tÃƒÂªte "Details transaction" + bouton X (le clic sur la carte ouvre/ferme dÃƒÂ©jÃƒÂ  le tiroir). (2) Suppression de la marge supÃƒÂ©rieure du tiroir (retrait de space-y-2 du wrapper de carte) Ã¢â€ â€™ le tiroir est collÃƒÂ© ÃƒÂ  la carte. (3) Retrait des ":" aprÃƒÂ¨s "Ãƒâ€°chÃƒÂ©ance" et "Ãƒâ‚¬ percevoir/Ãƒâ‚¬ payer". (4) Ligne d\'ÃƒÂ©chÃƒÂ©ance alignÃƒÂ©e par le bas (items-center Ã¢â€ â€™ items-end) : la jauge, la date et le montant partagent la mÃƒÂªme ligne de base infÃƒÂ©rieure.',
    changes: [
      'TransactionsPage.tsx : en-tÃƒÂªte du tiroir supprimÃƒÂ© ; wrapper de carte sans space-y-2 ; ligne ÃƒÂ©chÃƒÂ©ance sans ":" et items-end',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.22',
    date: '2026-05-31',
    description: 'Correctif important + mise en page. (1) BUG : la page Transactions se rechargeait une 2e fois quelques secondes aprÃƒÂ¨s l\'ouverture (l\'effet de chargement dÃƒÂ©pendait de l\'OBJET user ; aprÃƒÂ¨s rafraÃƒÂ®chissement de session, setUser renvoie un nouvel objet de mÃƒÂªme ID Ã¢â€ â€™ relance + setIsLoading Ã¢â€ â€™ la carte dÃƒÂ©pliÃƒÂ©e perdait sa position). CorrigÃƒÂ© en dÃƒÂ©pendant de user?.id (ID stable), comme le Dashboard. La carte ouverte conserve dÃƒÂ©sormais sa position. (2) Ligne d\'ÃƒÂ©chÃƒÂ©ance du dÃƒÂ©tail prÃƒÂªt : marge supÃƒÂ©rieure x1,5 (mt-2 Ã¢â€ â€™ mt-3) ; "Ãƒâ€°chÃƒÂ©ance :" et la date empilÃƒÂ©s verticalement ÃƒÂ  gauche ; "Ãƒâ‚¬ percevoir/Ãƒâ‚¬ payer :" et le montant empilÃƒÂ©s ÃƒÂ  droite (justifiÃƒÂ©s ÃƒÂ  droite).',
    changes: [
      'TransactionsPage.tsx : dÃƒÂ©pendance de l\'effet de chargement passÃƒÂ©e de [user, pathname] ÃƒÂ  [user?.id, pathname] (anti rechargement intempestif)',
      'TransactionsPage.tsx : ligne ÃƒÂ©chÃƒÂ©ance empilÃƒÂ©e (label au-dessus de la valeur, gauche/droite) + marge supÃƒÂ©rieure mt-3',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.21',
    date: '2026-05-31',
    description: 'DÃƒÂ©tail prÃƒÂªt (page Transactions) : insertion entre la date d\'ÃƒÂ©chÃƒÂ©ance et le montant "ÃƒÂ  percevoir" d\'une jauge horizontale fine et moderne du temps restant, avec compte ÃƒÂ  rebours "en direct" au format "12J, 3h22mn12s" (rafraÃƒÂ®chi chaque seconde). La barre se remplit ÃƒÂ  l\'approche de l\'ÃƒÂ©chÃƒÂ©ance et change de couleur selon l\'urgence (vert Ã¢â€ â€™ ambre Ã¢â€ â€™ rouge ; rouge plein + "Ãƒâ€°chÃƒÂ©ance dÃƒÂ©passÃƒÂ©e" si dÃƒÂ©passÃƒÂ©e). Marge supÃƒÂ©rieure de la ligne d\'ÃƒÂ©chÃƒÂ©ance doublÃƒÂ©e (mt-1 Ã¢â€ â€™ mt-2).',
    changes: [
      'Nouveau components/Loans/LoanDueCountdown.tsx : jauge + compte ÃƒÂ  rebours seconde par seconde, couleur selon urgence',
      'TransactionsPage.tsx : jauge insÃƒÂ©rÃƒÂ©e dans la ligne d\'ÃƒÂ©chÃƒÂ©ance + marge supÃƒÂ©rieure x2',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.20',
    date: '2026-05-31',
    description: 'Peaufinage mise en page du trio prÃƒÂªt. (1) Le taux journalier (ex: "0,017%/j") est dÃƒÂ©sormais accolÃƒÂ© au libellÃƒÂ© "Ã¢ÂÂ±Ã¯Â¸Â IntÃƒÂ©rÃƒÂªts courus" du trio. (2) La ligne de lÃƒÂ©gende sÃƒÂ©parÃƒÂ©e "IntÃƒÂ©rÃƒÂªts en temps rÃƒÂ©el Ã‚Â· X% / jour" sous le trio est supprimÃƒÂ©e (info dÃƒÂ©sormais dans le libellÃƒÂ©). (3) Inter-ligne rÃƒÂ©duit (mt-1 Ã¢â€ â€™ mt-0) entre le titre "Montant" et son contenu, sur les pages PrÃƒÂªts et Transactions.',
    changes: [
      'LoanLiveTrio.tsx : taux intÃƒÂ©grÃƒÂ© au libellÃƒÂ© "IntÃƒÂ©rÃƒÂªts courus", suppression de la lÃƒÂ©gende sous le trio',
      'TransactionsPage.tsx + LoansPage.tsx : bloc "Montant" resserrÃƒÂ© (mt-1 Ã¢â€ â€™ mt-0)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.19',
    date: '2026-05-31',
    description: '4 ajustements prÃƒÂªts. (1) Le champ "Taux d\'intÃƒÂ©rÃƒÂªt" de l\'ÃƒÂ©cran de modification met dÃƒÂ©sormais ÃƒÂ  jour le VRAI taux du prÃƒÂªt (nouvelle fonction loanService.updateLoanInterestRate qui ÃƒÂ©crit interest_rate + force interest_frequency="daily", offline-first) ; avant, il n\'allait que dans une note texte sans effet sur le calcul. Le champ est prÃƒÂ©-rempli avec le taux journalier effectif du prÃƒÂªt et son libellÃƒÂ© passe en "% / jour". (2) Le bloc "Notes" du dÃƒÂ©tail Transactions est masquÃƒÂ© quand il n\'y a aucune note (ÃƒÂ©pure). (3) L\'icÃƒÂ´ne Ã¢ÂÂ±Ã¯Â¸Â est dÃƒÂ©placÃƒÂ©e du bas de carte vers le libellÃƒÂ© "IntÃƒÂ©rÃƒÂªts courus" du trio (composant partagÃƒÂ© LoanLiveTrio). (4) Sous l\'ÃƒÂ©chÃƒÂ©ance (page Transactions), ajout ÃƒÂ  droite du montant total ÃƒÂ  percevoir/ÃƒÂ  payer ÃƒÂ  la date d\'ÃƒÂ©chÃƒÂ©ance (capital + intÃƒÂ©rÃƒÂªts capitalisÃƒÂ©s ÃƒÂ  cette date, calculÃƒÂ© par le moteur).',
    changes: [
      'loanService.ts : nouvelle updateLoanInterestRate(id, dailyRate) Ã¢â‚¬â€ interest_rate + interest_frequency="daily", Dexie+Supabase+queue',
      'TransactionDetailPage.tsx : champ taux prÃƒÂ©-rempli depuis la fiche prÃƒÂªt, libellÃƒÂ© "% / jour", persistance du taux ÃƒÂ  l\'enregistrement',
      'TransactionsPage.tsx : bloc Notes masquÃƒÂ© si vide + ligne ÃƒÂ©chÃƒÂ©ance avec "Ãƒâ‚¬ percevoir/Ãƒâ‚¬ payer : montant ÃƒÂ  l\'ÃƒÂ©chÃƒÂ©ance"',
      'LoanLiveTrio.tsx : icÃƒÂ´ne Ã¢ÂÂ±Ã¯Â¸Â dÃƒÂ©placÃƒÂ©e sur le libellÃƒÂ© "IntÃƒÂ©rÃƒÂªts courus"',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.18',
    date: '2026-05-31',
    description: 'Nettoyage notes prÃƒÂªt + ÃƒÂ©chÃƒÂ©ance. (1) La note texte "Taux: X%" (mÃƒÂ©mo figÃƒÂ© ÃƒÂ©crit ÃƒÂ  la crÃƒÂ©ation/ÃƒÂ©dition, devenu trompeur face au vrai taux journalier du trio) n\'est plus gÃƒÂ©nÃƒÂ©rÃƒÂ©e ÃƒÂ  l\'ÃƒÂ©dition (TransactionDetailPage) et est masquÃƒÂ©e ÃƒÂ  l\'affichage des prÃƒÂªts existants (segment "Taux:" filtrÃƒÂ© dans les notes du tiroir Transactions). On conserve "DurÃƒÂ©e: X mois". (2) La date d\'ÃƒÂ©chÃƒÂ©ance est dÃƒÂ©sormais affichÃƒÂ©e sous le trio dans le dÃƒÂ©tail d\'un prÃƒÂªt sur la page Transactions (ÃƒÂ©tait absente alors qu\'elle figure sur la page PrÃƒÂªts).',
    changes: [
      'TransactionDetailPage.tsx : suppression de la gÃƒÂ©nÃƒÂ©ration de la note "Taux: Ã¢â‚¬Â¦%" (conserve "DurÃƒÂ©e: Ã¢â‚¬Â¦ mois")',
      'TransactionsPage.tsx : filtre du segment "Taux:" ÃƒÂ  l\'affichage des notes + ligne "Ãƒâ€°chÃƒÂ©ance : JJ/MM/AAAA" sous le trio',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.17',
    date: '2026-05-31',
    description: 'Suite Ãƒâ€°tape B. (1) Nouveau composant partagÃƒÂ© LoanLiveTrio qui recalcule le trio Capital Ã‚Â· IntÃƒÂ©rÃƒÂªts courus Ã‚Â· Total dÃƒÂ» CHAQUE SECONDE (les intÃƒÂ©rÃƒÂªts montent visiblement) + lÃƒÂ©gende "Ã¢ÂÂ±Ã¯Â¸Â IntÃƒÂ©rÃƒÂªts en temps rÃƒÂ©el Ã‚Â· X% / jour". Avant, ces valeurs ÃƒÂ©taient calculÃƒÂ©es une seule fois au chargement (figÃƒÂ©es) sur la page PrÃƒÂªts Ã¢â€ â€™ corrigÃƒÂ©. (2) La page Transactions (dÃƒÂ©tail dÃƒÂ©pliable d\'une transaction de prÃƒÂªt) affiche dÃƒÂ©sormais EXACTEMENT le mÃƒÂªme trio que la page PrÃƒÂªts : elle charge le vrai prÃƒÂªt via getLoanById et utilise LoanLiveTrio, au lieu de l\'ancien affichage (taux brut tirÃƒÂ© des notes, "Restant" = capital seul sans intÃƒÂ©rÃƒÂªts). Le taux affichÃƒÂ© (% / jour effectif) est donc cohÃƒÂ©rent entre les deux pages. Montants en notation fr-FR (virgule = dÃƒÂ©cimale) : intÃƒÂ©rÃƒÂªts/total affichÃƒÂ©s avec 3 dÃƒÂ©cimales pour rendre la progression visible ÃƒÂ  la seconde.',
    changes: [
      'Nouveau components/Loans/LoanLiveTrio.tsx : trio recalculÃƒÂ© chaque seconde (setInterval 1s) tant que le taux > 0',
      'LoansPage.tsx : trio statique remplacÃƒÂ© par <LoanLiveTrio> (ticking)',
      'TransactionsPage.tsx : chargement du prÃƒÂªt complet (getLoanById) dans le tiroir + <LoanLiveTrio> identique ÃƒÂ  la page PrÃƒÂªts ; "Restant" capital-seul remplacÃƒÂ©',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.16',
    date: '2026-05-31',
    description: 'Nouveau modÃƒÂ¨le d\'intÃƒÂ©rÃƒÂªts Ã¢â‚¬â€ Ãƒâ€°TAPE B : propagation du calcul "en direct" ÃƒÂ  toute l\'app. Le moteur loanInterest devient la source de vÃƒÂ©ritÃƒÂ© unique via computeLoanDetails (loanService) : remainingBalance = total dÃƒÂ» (capital + intÃƒÂ©rÃƒÂªts courus), totalInterestPaid et la rÃƒÂ©partition intÃƒÂ©rÃƒÂªts/capital de chaque remboursement sont RECALCULÃƒâ€°S "intÃƒÂ©rÃƒÂªts d\'abord", et le statut "soldÃƒÂ©" est pilotÃƒÂ© par le moteur (capital + intÃƒÂ©rÃƒÂªts Ã¢â€°Ë† 0). Conversion automatique des ANCIENS taux selon leur frÃƒÂ©quence d\'origine : un taux "monthly" est divisÃƒÂ© par 30 (Ã¢â€ â€™ taux journalier correct), "weekly" par 7, "daily" gardÃƒÂ© tel quel Ã¢â‚¬â€ donc aucun besoin de migration SQL. Page PrÃƒÂªts : le bloc "Restant" affiche le trio Capital Ã‚Â· IntÃƒÂ©rÃƒÂªts courus Ã‚Â· Total dÃƒÂ» cÃƒÂ´te ÃƒÂ  cÃƒÂ´te ; "Taux" affichÃƒÂ© en % / jour effectif. Ancien systÃƒÂ¨me d\'"intÃƒÂ©rÃƒÂªts dus" par pÃƒÂ©riodes mensuelles RETIRÃƒâ€° (banniÃƒÂ¨re de la page PrÃƒÂªts + banniÃƒÂ¨re de la fenÃƒÂªtre de remboursement, dÃƒÂ©sormais basÃƒÂ©e sur les intÃƒÂ©rÃƒÂªts courus). Le write-path des remboursements est inchangÃƒÂ© (id/montant/date) : la rÃƒÂ©partition est recalculÃƒÂ©e ÃƒÂ  l\'affichage, donc toujours correcte y compris rÃƒÂ©troactivement.',
    changes: [
      'loanInterest.ts : conversion du taux selon interestFrequency (ÃƒÂ·30 mensuel, ÃƒÂ·7 hebdo) + sortie totalInterestPaid/totalCapitalPaid + allocations par remboursement (12 tests au total)',
      'loanService.computeLoanDetails : branchÃƒÂ© sur le moteur (remainingBalance = total dÃƒÂ», statut soldÃƒÂ© pilotÃƒÂ©, liveCapital/liveAccruedInterest/liveTotalOwed/liveDailyRatePct/liveAllocations)',
      'types/loans.ts : LoanWithDetails enrichi des champs live*',
      'LoansPage.tsx : trio CapitalÃ‚Â·IntÃƒÂ©rÃƒÂªtsÃ‚Â·Total dÃƒÂ», taux en %/jour, suppression de l\'ancien indicateur "intÃƒÂ©rÃƒÂªts dus" (banniÃƒÂ¨re + bloc)',
      'PaymentModal.tsx : banniÃƒÂ¨re "IntÃƒÂ©rÃƒÂªts courus" basÃƒÂ©e sur le calcul en direct (prop accruedInterest) au lieu des pÃƒÂ©riodes',
      'RepaymentHistorySection.tsx : part intÃƒÂ©rÃƒÂªts/capital recalculÃƒÂ©e par le moteur',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.15',
    date: '2026-05-31',
    description: 'Nouveau modÃƒÂ¨le d\'intÃƒÂ©rÃƒÂªts de prÃƒÂªt Ã¢â‚¬â€ Ãƒâ€°TAPE A (moteur + affichage Dashboard, sans toucher au reste de l\'app). Le taux saisi devient JOURNALIER (% / jour). IntÃƒÂ©rÃƒÂªt simple qui s\'accumule en continu (recalcul ÃƒÂ  la seconde) sur le capital restant, ÃƒÂ  partir de la date du prÃƒÂªt. Un remboursement paie d\'abord les intÃƒÂ©rÃƒÂªts dus, le reste rÃƒÂ©duit le capital. Ãƒâ‚¬ la date d\'ÃƒÂ©chÃƒÂ©ance, les intÃƒÂ©rÃƒÂªts accumulÃƒÂ©s sont capitalisÃƒÂ©s UNE FOIS (ajoutÃƒÂ©s au capital), puis l\'intÃƒÂ©rÃƒÂªt repart simple sur la nouvelle base ; sans ÃƒÂ©chÃƒÂ©ance, pas de capitalisation. Tout est recalculÃƒÂ© ÃƒÂ  la volÃƒÂ©e depuis le capital initial + les remboursements (aucune ÃƒÂ©criture en base, les anciennes rÃƒÂ©partitions sont ignorÃƒÂ©es). La carte "PrÃƒÂªts actifs" du Dashboard affiche en direct : GAINS (prÃƒÂªts accordÃƒÂ©s) et COÃƒâ€ºTS (prÃƒÂªts reÃƒÂ§us) sÃƒÂ©parÃƒÂ©s, avec intÃƒÂ©rÃƒÂªts courus + gain par minute/heure/jour/mois (mois = nb rÃƒÂ©el de jours du mois courant). Ãƒâ€°TAPE B ÃƒÂ  venir : propager ce calcul partout (dÃƒÂ©tail du prÃƒÂªt, total dÃƒÂ», listes) + remboursements "intÃƒÂ©rÃƒÂªts d\'abord" persistÃƒÂ©s.',
    changes: [
      'Nouveau (services/loanInterest.ts) : moteur pur computeLoanLiveState() + sumLoanLiveStates() Ã¢â‚¬â€ couvert par 7 tests (services/__tests__/loanInterest.test.ts)',
      'DashboardPage.tsx : chargement des prÃƒÂªts reÃƒÂ§us (borrowedLoans), tick 1s, carte "PrÃƒÂªts actifs" enrichie (gains verts / coÃƒÂ»ts rouges, lignes par minute/heure/jour/mois)',
      'AddTransactionPage.tsx : libellÃƒÂ© "Taux d\'intÃƒÂ©rÃƒÂªt % / jour" + interest_frequency stockÃƒÂ© en "daily" (prÃƒÂªt accordÃƒÂ© et reÃƒÂ§u)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.14',
    date: '2026-05-31',
    description: 'Suite de v3.16.13. La fenÃƒÂªtre de sÃƒÂ©lection de contacts est imposÃƒÂ©e par Chrome (Contact Picker API) : impossible de la remplacer par l\'appli Contacts native ni de la restyler (rÃƒÂ¨gle de confidentialitÃƒÂ© du navigateur). Elle affiche un compteur "1 sÃƒÂ©lectionnÃƒÂ©" plutÃƒÂ´t que le nom, ce qui dÃƒÂ©routait. CÃƒÂ´tÃƒÂ© app, ajout d\'une confirmation visible APRÃƒË†S validation : ligne verte "Ã¢Å“â€œ Contact retenu : Nom Ã‚Â· NumÃƒÂ©ro" sous le champ + toast immÃƒÂ©diat. L\'astuce indique dÃƒÂ©sormais la marche ÃƒÂ  suivre dans la fenÃƒÂªtre Chrome (cocher un nom puis "Ajouter"). La confirmation se met ÃƒÂ  jour aprÃƒÂ¨s le choix du numÃƒÂ©ro (contact multi-numÃƒÂ©ros), s\'efface si l\'utilisateur retape le nom ÃƒÂ  la main, et est rÃƒÂ©initialisÃƒÂ©e aprÃƒÂ¨s crÃƒÂ©ation.',
    changes: [
      'AddTransactionPage.tsx : ÃƒÂ©tat contactConfirm {name, phone} + ligne verte de confirmation (CheckCircle2) sous le champ bÃƒÂ©nÃƒÂ©ficiaire/prÃƒÂªteur',
      'AddTransactionPage.tsx : toast.success immÃƒÂ©diat ÃƒÂ  la sÃƒÂ©lection + ÃƒÂ  la confirmation du numÃƒÂ©ro',
      'AddTransactionPage.tsx : astuce ÃƒÂ©largie expliquant la fenÃƒÂªtre Chrome (cocher + Ajouter)',
      'AddTransactionPage.tsx : contactConfirm effacÃƒÂ© ÃƒÂ  la saisie clavier manuelle, mis ÃƒÂ  jour au choix du numÃƒÂ©ro, rÃƒÂ©initialisÃƒÂ© aprÃƒÂ¨s succÃƒÂ¨s',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.13',
    date: '2026-05-31',
    description: 'CrÃƒÂ©ation de prÃƒÂªt (AddTransactionPage, catÃƒÂ©gories "prÃƒÂªt accordÃƒÂ©" et "prÃƒÂªt reÃƒÂ§u") : une icÃƒÂ´ne rÃƒÂ©pertoire Ã°Å¸â€œâ€¡ apparaÃƒÂ®t ÃƒÂ  droite du champ BÃƒÂ©nÃƒÂ©ficiaire/PrÃƒÂªteur sur les appareils qui supportent l\'API Contact Picker (Chrome/Edge Android, HTTPS). Le clic ouvre le sÃƒÂ©lecteur de contacts natif d\'Android et remplit automatiquement le nom + le tÃƒÂ©lÃƒÂ©phone. Si le contact a plusieurs numÃƒÂ©ros, une petite fenÃƒÂªtre "Quel numÃƒÂ©ro ?" laisse choisir. Sur iOS/desktop (API absente), aucune icÃƒÂ´ne : saisie clavier classique prÃƒÂ©servÃƒÂ©e (l\'autocomplÃƒÂ©tion des bÃƒÂ©nÃƒÂ©ficiaires connus reste intacte). Le tÃƒÂ©lÃƒÂ©phone du prÃƒÂªt accordÃƒÂ© est dÃƒÂ©sormais aussi CONSERVÃƒâ€° dans la fiche (auparavant perdu aprÃƒÂ¨s le lien WhatsApp). Un champ tÃƒÂ©lÃƒÂ©phone est ajoutÃƒÂ© au prÃƒÂªt reÃƒÂ§u (numÃƒÂ©ro du prÃƒÂªteur rangÃƒÂ© dans borrower_phone, inutilisÃƒÂ© pour ce type ; bouton WhatsApp prÃƒÂªteur ÃƒÂ  venir).',
    changes: [
      'AddTransactionPage.tsx : dÃƒÂ©tection supportsContactPicker (navigator.contacts + ContactsManager) au niveau module',
      'AddTransactionPage.tsx : handlePickContact() Ã¢â€ â€™ navigator.contacts.select([name, tel]) + applyContactName() (rÃƒÂ©plique l\'auto-libellÃƒÂ©) + fenÃƒÂªtre de choix du numÃƒÂ©ro si plusieurs',
      'AddTransactionPage.tsx : bouton icÃƒÂ´ne BookUser ÃƒÂ  droite du champ beneficiaryName (affichÃƒÂ© si supportsContactPicker), champ toujours tapable au clavier',
      'AddTransactionPage.tsx : champ "TÃƒÂ©lÃƒÂ©phone du prÃƒÂªteur" ajoutÃƒÂ© pour la catÃƒÂ©gorie loan_received',
      'AddTransactionPage.tsx : borrower_phone = borrowerPhone.trim() ÃƒÂ  l\'INSERT (prÃƒÂªt accordÃƒÂ© ET prÃƒÂªt reÃƒÂ§u) Ã¢â‚¬â€ le numÃƒÂ©ro est dÃƒÂ©sormais persistÃƒÂ©',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.12',
    date: '2026-05-31',
    description: 'Suite de v3.16.11. Les pages ÃƒÂ  structure "carte titre flottante" (ParamÃƒÂ¨tres, Version de l\'app, PrÃƒÂ©fÃƒÂ©rences notifications, Quiz, RÃƒÂ©sultats quiz, Instructions PWA, Profil) utilisaient py-8 (32px) en haut Ã¢â€ â€™ ~40px d\'espace sous l\'en-tÃƒÂªte une fois le pt-2 global ajoutÃƒÂ©, soit beaucoup plus que les 8px des autres pages. Marge haute retirÃƒÂ©e (py-8 Ã¢â€ â€™ pb-8, ou root py-8 Ã¢â€ â€™ pb-8), l\'ÃƒÂ©cart de 8px venant dÃƒÂ©sormais de <main>. Les pages ÃƒÂ  bandeau colorÃƒÂ© pleine largeur (Recommandations, RÃƒÂ©vision budgets) gardaient un mince filet gris de 8px au-dessus de leur bandeau (ÃƒÂ  cause du pt-2 global) Ã¢â€ â€™ recollÃƒÂ©es sous l\'en-tÃƒÂªte via -mt-2',
    changes: [
      'pages (Settings, AppVersion, NotificationPreferences, Quiz, QuizResults, PWAInstructions) : conteneur max-w-4xl mx-auto px-4 py-8 Ã¢â€ â€™ px-4 pb-8',
      'ProfileCompletionPage.tsx : conteneur racine min-h-screen bg-gray-50 py-8 Ã¢â€ â€™ pb-8',
      'RecommendationsPage.tsx / BudgetReviewPage.tsx : bandeau d\'en-tÃƒÂªte bg-gradient-to-r ... text-white Ã¢â€ â€™ +(-mt-2) pour rester collÃƒÂ© sous l\'en-tÃƒÂªte malgrÃƒÂ© le pt-2 global',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.11',
    date: '2026-05-31',
    description: 'GÃƒÂ©nÃƒÂ©ralisation ÃƒÂ  toutes les pages du comportement validÃƒÂ© en v3.16.10 sur la page DÃƒÂ©tail/Modifier transaction. Deux rÃƒÂ©glages centraux (components/Layout) plutÃƒÂ´t que ~18 retouches dispersÃƒÂ©es : (1) nouveau composant ScrollToTop qui remonte la fenÃƒÂªtre en haut ÃƒÂ  chaque ouverture de page (navigation PUSH), pour qu\'aucune page ne s\'ouvre "au milieu" en venant d\'une liste dÃƒÂ©filÃƒÂ©e ; (2) marge pt-2 (8px) posÃƒÂ©e une seule fois sur <main> dans AppLayout Ã¢â€ â€™ ÃƒÂ©cart identique sous l\'en-tÃƒÂªte pour toutes les pages. Le pt-2 local de TransactionDetailPage est retirÃƒÂ© (l\'ÃƒÂ©cart vient dÃƒÂ©sormais de <main>, sinon doublon ÃƒÂ  16px)',
    changes: [
      'Nouveau (components/Layout/ScrollToTop.tsx) : window.scrollTo(0,0) sur changement de pathname, ignorÃƒÂ© en navigation POP (retour/avance) et quand location.state.scrollToTransactionId est prÃƒÂ©sent (prÃƒÂ©serve le dÃƒÂ©filement-vers-carte au retour sur /transactions)',
      'AppLayout.tsx : montage de <ScrollToTop /> + ajout de pt-2 sur <main> (flex-1 pb-20 pt-2 ...)',
      'TransactionDetailPage.tsx : conteneur racine pt-2 Ã¢â€ â€™ (rien), l\'ÃƒÂ©cart de 8px ÃƒÂ©tant dÃƒÂ©sormais fourni par <main>',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.10',
    date: '2026-05-31',
    description: 'Page DÃƒÂ©tail/Modifier d\'une transaction (pages/TransactionDetailPage.tsx) : le bandeau titre blanc ("Modifier la transaction") ÃƒÂ©tait sÃƒÂ©parÃƒÂ© de l\'en-tÃƒÂªte par un grand espace vide. Cause : marge haute pt-20 (80px) hÃƒÂ©ritÃƒÂ©e d\'une ÃƒÂ©poque oÃƒÂ¹ l\'en-tÃƒÂªte ÃƒÂ©tait fixed (hors flux) ; or l\'en-tÃƒÂªte est dÃƒÂ©sormais sticky (dans le flux, occupe dÃƒÂ©jÃƒÂ  sa place), donc cette marge faisait double emploi. RÃƒÂ©duite ÃƒÂ  pt-2 (8px) pour caler le bandeau juste sous l\'en-tÃƒÂªte, ÃƒÂ©cart cohÃƒÂ©rent avec l\'alignement des cartes',
    changes: [
      'Fix (TransactionDetailPage.tsx) : conteneur racine pt-20 Ã¢â€ â€™ pt-2',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.9',
    date: '2026-05-31',
    description: 'Au clic sur une carte de transaction (pages/TransactionsPage.tsx), le recalage du haut de la carte sous l\'en-tÃƒÂªte se faisait en deux dÃƒÂ©filements natifs successifs (glissement + correction ÃƒÂ  450ms) Ã¢â€ â€™ mouvement saccadÃƒÂ©. RemplacÃƒÂ© par une seule animation maison (requestAnimationFrame + courbe ease-in-out cubic) qui accÃƒÂ©lÃƒÂ¨re puis ralentit en douceur faÃƒÂ§on iOS. La cible est recalculÃƒÂ©e ÃƒÂ  chaque image Ã¢â€ â€™ auto-correction continue si la hauteur du dessus de l\'ÃƒÂ©cran change pendant l\'animation (message de l\'en-tÃƒÂªte, barre d\'adresse mobile, dÃƒÂ©tail qui se dÃƒÂ©plie), sans saut ni recalage visible. Respecte prefers-reduced-motion',
    changes: [
      'Refactor (TransactionsPage.tsx toggleTransactionDrawer) : double scrollBy natif (smooth + correction setTimeout 450ms) remplacÃƒÂ© par une boucle requestAnimationFrame de 500ms (easeInOutCubic) recalculant getTargetY ÃƒÂ  chaque frame, avec fenÃƒÂªtre de grÃƒÂ¢ce 250ms pour suivre une bascule tardive. Court-circuit si prefers-reduced-motion (scroll instantanÃƒÂ©) ou si dÃƒÂ©jÃƒÂ  alignÃƒÂ© (<2px)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.8',
    date: '2026-05-31',
    description: 'Au clic sur une carte de transaction (pages/TransactionsPage.tsx), le dÃƒÂ©filement qui amÃƒÂ¨ne le haut de la carte juste sous l\'en-tÃƒÂªte partait parfois trop haut (la carte passait derriÃƒÂ¨re l\'en-tÃƒÂªte). Cause : la position cible ÃƒÂ©tait mesurÃƒÂ©e une seule fois 50ms aprÃƒÂ¨s le clic, mais la hauteur du dessus de l\'ÃƒÂ©cran pouvait encore changer pendant l\'animation (message de l\'en-tÃƒÂªte mobile qui tourne, barre d\'adresse du navigateur mobile qui se replie, dÃƒÂ©tail qui finit de se dÃƒÂ©plier) Ã¢â€ â€™ cible figÃƒÂ©e invalidÃƒÂ©e. Correctif : mesure aprÃƒÂ¨s stabilisation de la mise en page (double requestAnimationFrame) + correction finale aprÃƒÂ¨s l\'animation pour rattraper tout dÃƒÂ©calage rÃƒÂ©siduel',
    changes: [
      'Fix (TransactionsPage.tsx toggleTransactionDrawer) : remplacement du setTimeout(50)+scrollBy unique par un double requestAnimationFrame puis alignCardTop, avec une passe de correction ÃƒÂ  450ms (seuil 2px pour ÃƒÂ©viter tout micro-rebond). Effets de bord sortis du updater setSelectedTransactionId (willOpen calculÃƒÂ© en amont)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.7',
    date: '2026-05-31',
    description: 'DÃƒÂ©tail de transaction dÃƒÂ©pliÃƒÂ© (pages/TransactionsPage.tsx) : pour une opÃƒÂ©ration simple (non prÃƒÂªt), les blocs "Partage famille" et "Remboursement" ÃƒÂ©taient empilÃƒÂ©s verticalement. Ils sont dÃƒÂ©sormais sur une mÃƒÂªme ligne (flex, deux colonnes ÃƒÂ©gales). Quand l\'opÃƒÂ©ration n\'est pas partagÃƒÂ©e, le bloc "Partage famille" occupe seul la pleine largeur',
    changes: [
      'UI (TransactionsPage.tsx grille dÃƒÂ©tail) : "Partage famille" et "Remboursement" regroupÃƒÂ©s dans un conteneur flex gap-2, chaque bloc en flex-1. Condition Remboursement passÃƒÂ©e de (isShared && !isLoanCategory) ÃƒÂ  (isShared) imbriquÃƒÂ© dans le bloc !isLoanCategory parent',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.6',
    date: '2026-05-31',
    description: 'Page RÃƒÂ©glages Ã¢â‚¬Âº Version (pages/AppVersionPage.tsx) : deux entrÃƒÂ©es d\'historique portaient le mÃƒÂªme numÃƒÂ©ro 2.5.0 Ã¢â€ â€™ warning React "two children with the same key" et les deux cartes s\'ouvraient/fermaient ensemble. Correctif : la clÃƒÂ© React et l\'identitÃƒÂ© d\'expansion utilisent dÃƒÂ©sormais l\'index dans la liste (Set<number>) au lieu du numÃƒÂ©ro de version. Aucune donnÃƒÂ©e d\'historique modifiÃƒÂ©e',
    changes: [
      'Fix (AppVersionPage.tsx) : expandedVersions Set<string> Ã¢â€ â€™ Set<number> ; toggleVersionExpansion(index) ; key={`${version}-${index}`} ; isExpanded via index',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.5',
    date: '2026-05-31',
    description: 'Carte de transaction (pages/TransactionsPage.tsx) : le nom du compte est dÃƒÂ©placÃƒÂ© dans l\'en-tÃƒÂªte, ÃƒÂ  cÃƒÂ´tÃƒÂ© de la catÃƒÂ©gorie (place libÃƒÂ©rÃƒÂ©e par le retrait de la date en v3.16.4). Le champ "Compte" du dÃƒÂ©tail est retirÃƒÂ© (redondant). Pour une opÃƒÂ©ration simple, la grille de dÃƒÂ©tail n\'est plus affichÃƒÂ©e du tout (montant + catÃƒÂ©gorie + compte sont sur la carte) ; elle reste pour les prÃƒÂªts/remboursements (barre de progression / lien dette)',
    changes: [
      'UI (TransactionsPage.tsx en-tÃƒÂªte) : ajout du nom du compte (accountName via repaymentAccounts) aprÃƒÂ¨s la catÃƒÂ©gorie, masquÃƒÂ© si introuvable (jamais d\'UUID brut)',
      'UI (TransactionsPage.tsx grille dÃƒÂ©tail) : grille entiÃƒÂ¨re conditionnÃƒÂ©e ÃƒÂ  isLoanCategory ; bloc Compte supprimÃƒÂ©. DÃƒÂ©tail d\'une opÃƒÂ©ration simple = Notes + Partage famille + Remboursement uniquement',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.4',
    date: '2026-05-31',
    description: 'DÃƒÂ©tail de transaction dÃƒÂ©pliÃƒÂ© (pages/TransactionsPage.tsx) : le champ "Montant" rÃƒÂ©pÃƒÂ©tait le montant dÃƒÂ©jÃƒÂ  affichÃƒÂ© sur la carte pour les opÃƒÂ©rations simples. Il est dÃƒÂ©sormais rÃƒÂ©servÃƒÂ© aux prÃƒÂªts/remboursements (oÃƒÂ¹ il porte la barre de progression / le lien dette). Pour une opÃƒÂ©ration simple, le dÃƒÂ©tail n\'affiche plus que le "Compte" (passÃƒÂ© en pleine largeur). Montant et Compte ÃƒÂ©tant mutuellement exclusifs (isLoanCategory), la grille reste ÃƒÂ©quilibrÃƒÂ©e',
    changes: [
      'UI (TransactionsPage.tsx grille dÃƒÂ©tail) : bloc Montant conditionnÃƒÂ© ÃƒÂ  isLoanCategory ; bloc Compte passÃƒÂ© en col-span-2 (seul champ pour les opÃƒÂ©rations simples)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.3',
    date: '2026-05-30',
    description: 'Suppression de transaction : la fenÃƒÂªtre de confirmation propose dÃƒÂ©sormais 2 actions Ã¢â‚¬â€ "Supprimer" (retire l\'opÃƒÂ©ration sans toucher au solde) et "Restituer" (retire l\'opÃƒÂ©ration ET rend son montant au compte). DÃƒÂ©couverte au passage : updateAccountBalancePublic/updateAccountBalance ÃƒÂ©tait une coquille vide (no-op) Ã¢â€ â€™ la page dÃƒÂ©tail croyait restituer le solde mais ne le faisait pas. La restitution passe maintenant par la vraie mise ÃƒÂ  jour (updateAccountBalanceAfterTransaction)',
    changes: [
      'Nouveau composant (components/UI/DeleteRestoreDialog.tsx) + helper (utils/dialogUtils.ts showDeleteRestoreDialog) : fenÃƒÂªtre ÃƒÂ  3 boutons Annuler / Supprimer / Restituer, avec texte explicatif des deux actions. "Restituer" mis en avant (vert)',
      'Refonte (services/transactionService.ts deleteTransaction) : nouveau paramÃƒÂ¨tre options { restoreBalance } ; quand true, restitue le solde via updateAccountBalanceAfterTransaction(accountId, -amount). Gestion centralisÃƒÂ©e de la paire de transfert (suppression + restitution des 2 comptes via rappel rÃƒÂ©cursif _skipPairHandling). Comportement par dÃƒÂ©faut (restoreBalance=false) inchangÃƒÂ©',
      'pages/TransactionsPage.tsx : handleDeleteTransaction utilise showDeleteRestoreDialog ; rechargement de la liste aprÃƒÂ¨s suppression d\'un transfert (la ligne jumelle disparaÃƒÂ®t aussi)',
      'pages/TransactionDetailPage.tsx : ancienne fenÃƒÂªtre inline 2 boutons remplacÃƒÂ©e par showDeleteRestoreDialog ; handleDelete(restoreBalance) dÃƒÂ©lÃƒÂ¨gue ÃƒÂ  deleteTransaction ; suppression du code mort (handleSingleTransactionDeletion, logique de paire dupliquÃƒÂ©e, appels no-op updateAccountBalancePublic, ÃƒÂ©tats showDeleteConfirm/isDeleting)',
      'UI (pages/TransactionsPage.tsx carte + dÃƒÂ©tail dÃƒÂ©pliÃƒÂ©) : suppression des informations redondantes. La date n\'apparaÃƒÂ®t plus qu\'une fois (ÃƒÂ  droite) et affiche dÃƒÂ©sormais la date de l\'OPÃƒâ€°RATION (transaction.date) au lieu de createdAt. CatÃƒÂ©gorie affichÃƒÂ©e une seule fois (en-tÃƒÂªte). Champ "Compte" du dÃƒÂ©tail : affiche le nom du compte (repaymentAccounts) au lieu de l\'UUID brut. Grille dÃƒÂ©tail rÃƒÂ©duite ÃƒÂ  Montant + Compte',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.2',
    date: '2026-05-30',
    description: 'Fix suppression impossible sur la page Transactions : le bouton "Supprimer" appelait window.confirm(), neutralisÃƒÂ© par dialogService (override qui logue un warning et ne montre pas de dialogue cliquable) Ã¢â€ â€™ la confirmation ne s\'affichait pas Ã¢â€ â€™ aucune suppression possible. Bloquait le nettoyage manuel des doublons existants (RAISSA, Taxi, prÃƒÂªts, etc.)',
    changes: [
      'Fix (pages/TransactionsPage.tsx handleDeleteTransaction) : remplacement de window.confirm() par showConfirm() async de utils/dialogUtils (variant danger, boutons Supprimer/Annuler), mÃƒÂªme pattern que GoalsPage. Ajout de l\'import showConfirm',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.1',
    date: '2026-05-30',
    description: 'Fix doublons en synchronisation : un enregistrement crÃƒÂ©ÃƒÂ© sous mauvais rÃƒÂ©seau apparaissait 2-3 fois (RAISSA Ãƒâ€”3). Cause = l\'envoi direct (timeout 5s mais commit serveur rÃƒÂ©el) puis le rejeu de la file rÃƒÂ©-insÃƒÂ©raient avec des id serveur diffÃƒÂ©rents. Correctif : conserver l\'id client des deux cÃƒÂ´tÃƒÂ©s + upsert idempotent (onConflict id) sur tous les chemins offline-first/mis en file',
    changes: [
      'Fix (services/syncManager.ts) : les 14 branches CREATE de processXxxOperation ne retirent plus l\'id client et passent de .insert() ÃƒÂ  .upsert(data, { onConflict: \'id\', ignoreDuplicates: true }). Tables : transactions, accounts, budgets, goals, fee_configurations, personal_loans, loan_repayments, loan_interest_periods, reimbursement_requests, family_shared_transactions, family_sharing_rules, family_shared_recurring_transactions, family_members. L\'id ÃƒÂ©tait dÃƒÂ©jÃƒÂ  prÃƒÂ©sent dans data (queueSyncOperation merge { id, ...data }) mais ÃƒÂ©tait jetÃƒÂ© au rejeu',
      'Fix (services/apiService.ts) : createTransaction/createAccount/createBudget/createGoal passent de .insert() ÃƒÂ  .upsert({...}, { onConflict: \'id\' }).select().single() Ã¢â‚¬â€ l\'envoi direct online devient idempotent',
      'Fix (services/transactionService.ts, accountService.ts, budgetService.ts, goalService.ts) : le payload de l\'envoi direct online inclut dÃƒÂ©sormais l\'id local (id transaction/compte ; mappers budget/goal enrichis). Avant, l\'id n\'ÃƒÂ©tait pas transmis Ã¢â€ â€™ le serveur en gÃƒÂ©nÃƒÂ©rait un alÃƒÂ©atoire Ã¢â€ â€™ impossible de dÃƒÂ©dupliquer un envoi dÃƒÂ©jÃƒÂ  passÃƒÂ©',
      'Fix (services/loanService.ts) : createLoan (personal_loans), recordPayment (loan_repayments), generateInterestPeriod (loan_interest_periods) passent en upsert onConflict id (les helpers loanToRow/repaymentToRow/interestPeriodToRow incluaient dÃƒÂ©jÃƒÂ  l\'id)',
      'Fix (services/familySharingService.ts) : shareTransaction (family_shared_transactions), pushReimbursementInsert (reimbursement_requests), upsertSharingRule CREATE (family_sharing_rules), shareRecurringTransaction (family_shared_recurring_transactions) passent en upsert onConflict id',
      'Hors pÃƒÂ©rimÃƒÂ¨tre (chemins purement en ligne, sans file ni id client, non concernÃƒÂ©s par le double-envoi) : familyGroupService.createFamilyGroup + joinFamilyGroup (family_groups/family_members, id serveur), reimbursementService.createReimbursementRequest et reimbursement_payments/allocations/member_credit_balance (opÃƒÂ©rations synchrones online-only)',
      'Ãƒâ‚¬ FAIRE en session sÃƒÂ©parÃƒÂ©e (validÃƒÂ© avec JOEL) : nettoyage des doublons dÃƒÂ©jÃƒÂ  prÃƒÂ©sents en base + IndexedDB (RAISSA Ãƒâ€”3, Taxi Ãƒâ€”2, etc.) et recalcul des soldes faussÃƒÂ©s. Le prÃƒÂ©sent correctif empÃƒÂªche seulement la crÃƒÂ©ation de NOUVEAUX doublons',
    ],
    type: 'patch' as const
  },
  {
    version: '3.16.0',
    date: '2026-05-18',
    description: 'S73 Bloc 3 Ã¢â‚¬â€ updateSharedTransaction offline-first complet (cascade reimbursement_requests + tous champs) + correction bug dÃƒÂ©coche en ligne + icÃƒÂ´ne CloudOff TransactionDetailPage',
    changes: [
      'Refonte (services/familySharingService.ts updateSharedTransaction) : ~440 lignes online-only (6 round-trips Supabase, supabase.auth.getUser() bloquant offline) remplacÃƒÂ©es par ~100 lignes offline-first SWR. Lecture ownership depuis Dexie (familySharedTransactions.get), UPDATE local immÃƒÂ©diat, cascade complÃƒÂ¨te reimbursement_requests via Dexie, push Supabase si online sinon queue syncManager (4 nouveaux helpers : applyReimbursementUpsertCascade, applyReimbursementRemovalCascade, pushFstUpdate, pushReimbursementInsert/Update/Delete)',
      'Cascade reimbursement (Q5/Q6 OUI) : recalcul automatique du montant de la demande de remboursement ÃƒÂ  chaque changement de hasReimbursementRequest, customReimbursementRate, splitType ou splitDetails. Logique de calcul reproduite cÃƒÂ´tÃƒÂ© client : rate effectif (custom > localStorage groupe > 100%), montant selon splitType (paid_by_one = total Ãƒâ€” rate, autres = splitDetails[debtor].amount Ãƒâ€” rate)',
      'Lookup crÃƒÂ©ancier/dÃƒÂ©biteur depuis cache Dexie familyMembers (v15, S71) : index composite [familyGroupId+userId] pour le payeur (crÃƒÂ©ancier), filter sur isActive pour exclure les membres partis. Snapshots dÃƒÂ©normalisÃƒÂ©s (fromMemberName, toMemberName, fromMemberUserId, toMemberUserId) ÃƒÂ©crits directement dans ReimbursementRequestLocal pour les vÃƒÂ©rifications offline',
      'Correction bug en ligne (Q2 NON) : dÃƒÂ©cocher hasReimbursementRequest supprime maintenant la demande de remboursement partout (Dexie + Supabase). Avant, la demande restait orpheline en base avec seul l\'indicateur basculÃƒÂ©. Q7 C : si la demande a dÃƒÂ©jÃƒÂ  des paiements liÃƒÂ©s (reimbursement_payments), elle passe en status=cancelled au lieu de DELETE pour prÃƒÂ©server l\'historique. DÃƒÂ©tection des paiements via SELECT online, dÃƒÂ©gradation safe = cancel en offline (pas de cache reimbursement_payments en S73)',
      'PÃƒÂ©rimÃƒÂ¨tre ÃƒÂ©tendu Q3 A : isPrivate, splitType, splitDetails passent aussi en offline-first dans la mÃƒÂªme refonte. RPC update_reimbursement_request conservÃƒÂ©e en ligne (bypass RLS pour la bascule du flag), UPDATE direct via syncManager au retour online',
      'Nettoyage (pages/TransactionDetailPage.tsx) : suppression de 2 workarounds setTimeout(500ms) + UPDATE direct supabase.reimbursement_requests.amount (lignes 530-557 aprÃƒÂ¨s shareTransaction, lignes 576-610 aprÃƒÂ¨s updateSharedTransaction). Le service S73 calcule et ÃƒÂ©crit le montant correct directement, plus besoin de patch',
      'Ajout (pages/TransactionDetailPage.tsx) : icÃƒÂ´ne CloudOff orange ÃƒÂ  cÃƒÂ´tÃƒÂ© du label "Demander remboursement" tant qu\'une opÃƒÂ©ration sync (family_shared_transactions ou reimbursement_requests) reste en queue pending/failed pour cette transaction. useEffect polling 5s comme LoansPage. Toast jaune "Remboursement sera crÃƒÂ©ÃƒÂ© ÃƒÂ  la prochaine connexion" quand on coche hors ligne (Q1 C, Q8 C : toast + icÃƒÂ´ne persistante)',
      'Imports : ReimbursementRequestLocal depuis types/reimbursement.ts ajoutÃƒÂ© au service. CloudOff depuis lucide-react ajoutÃƒÂ© ÃƒÂ  la page',
      'Risques acceptÃƒÂ©s Q10 S72 : si un membre quitte le groupe entre l\'enregistrement local et la synchro, le serveur peut rejeter (retry syncManager puis ÃƒÂ©chec). Si la RLS Supabase bloque l\'UPDATE direct rejouÃƒÂ© par le syncManager (sans la RPC), il faudra ajouter une policy SQL cÃƒÂ´tÃƒÂ© serveur Ã¢â‚¬â€ ÃƒÂ  valider en prod',
    ],
    type: 'minor' as const
  },
  {
    version: '3.15.0',
    date: '2026-05-17',
    description: 'S72 Ã¢â‚¬â€ Module Family Sharing offline-first phase 1 (lectures SWR + mutations queue-able + leaveFamilyGroup) + BudgetsPage createBudget via budgetService',
    changes: [
      'Dexie v16 (lib/database.ts): 3 nouvelles tables locales Ã¢â‚¬â€ familySharedTransactions (avec snapshots dÃƒÂ©normalisÃƒÂ©s transactionDescription/Amount/Category/Date/Type), familySharingRules, familySharedRecurring. Index composites pour les filtres usuels ([familyGroupId+sharedAt], [familyGroupId+userId+category], [familyGroupId+recurringTransactionId]). Migration upgrade vide',
      'Nouveau fichier (types/familyLocal.ts): FamilySharedTransactionLocal + FamilySharingRuleLocal + FamilySharedRecurringLocal Ã¢â‚¬â€ sources uniques des interfaces Dexie',
      'Refactor (services/familySharingService.ts): 5 lectures critiques passent en stale-while-revalidate (IndexedDB d\'abord, refresh Supabase fire-and-forget). getFamilySharedTransactions (filter par familyGroupId + options en mÃƒÂ©moire), getUserSharingRules ([familyGroupId+userId]), getSharedTransactionByTransactionId (par transactionId), getSharedRecurringTransactions, shouldAutoShare ([familyGroupId+userId+category])',
      'Refactor (services/familySharingService.ts): 6 mutations offline-first Ã¢â‚¬â€ shareTransaction (UUID client + INSERT Dexie + snapshots de transaction lus depuis Dexie + queue ou Supabase), unshareTransaction (cascade DELETE des reimbursement_requests liÃƒÂ©s via queue + DELETE shared_transaction), upsertSharingRule (UPDATE local si rÃƒÂ¨gle existe sinon INSERT), deleteSharingRule, shareRecurringTransaction (vÃƒÂ©rif ownership Dexie + INSERT local), unshareRecurringTransaction',
      'Refactor (services/familyGroupService.ts): leaveFamilyGroup offline-first Ã¢â‚¬â€ vÃƒÂ©rification "dernier admin" depuis cache local familyMembers, soft delete local (is_active=false) + queue UPDATE family_members. createFamilyGroup et joinFamilyGroup conservent un message clair "nÃƒÂ©cessite connexion Internet" (gÃƒÂ©nÃƒÂ©ration de code d\'invitation + validation cÃƒÂ´tÃƒÂ© serveur)',
      'Extend (services/syncManager.ts): switch table_name ÃƒÂ©tendu avec 4 nouveaux cases Ã¢â‚¬â€ family_shared_transactions, family_sharing_rules, family_shared_recurring_transactions, family_members (INSERT/UPDATE/DELETE classiques)',
      'Type extension (types/index.ts): SyncOperation.table_name accepte dÃƒÂ©sormais les 4 nouvelles tables famille',
      'Fix (pages/BudgetsPage.tsx): les 3 emplacements qui crÃƒÂ©aient des budgets directement via apiService.createBudget (online-only) passent maintenant par budgetService.createBudget (offline-first avec queue). Concerne handleCreateIntelligentBudgets (suggestions auto), handleSaveCustomizedBudgets (suggestions personnalisÃƒÂ©es) et handleSaveNewBudget (crÃƒÂ©ation manuelle). En offline, le budget est crÃƒÂ©ÃƒÂ© en local et envoyÃƒÂ© au serveur dÃƒÂ¨s le retour de connexion sans saisie utilisateur',
      'Architecture: tous les services mÃƒÂ©tier (loans, family sharing, family group, reimbursement, account, goal, transaction, budget, recurring) utilisent dÃƒÂ©sormais le mÃƒÂªme pattern offline-first SWR + queue. Le module Famille est dÃƒÂ©sormais utilisable hors connexion (consultation des dÃƒÂ©penses partagÃƒÂ©es, rÃƒÂ¨gles automatiques, partages rÃƒÂ©currents) sauf crÃƒÂ©ation/jointure de groupe (code d\'invitation serveur) et activation de demande de remboursement complexe (cascade reportÃƒÂ©e S73 Bloc 3)',
      'Reste ÃƒÂ  faire (S73 Bloc 3) : updateSharedTransaction cascade hasReimbursementRequest offline-first complÃƒÂ¨te (logique RPC reproduite cÃƒÂ´tÃƒÂ© client) Ã¢â‚¬â€ reportÃƒÂ© pour gÃƒÂ©rer la complexitÃƒÂ© dans une session dÃƒÂ©diÃƒÂ©e',
    ],
    type: 'minor' as const
  },
  {
    version: '3.14.6',
    date: '2026-05-16',
    description: 'P1#2 Ã¢â‚¬â€ table Dexie family_members + helper verifyMembership + getFamilyGroupMembers SWR offline-first + 5 lectures familySharingService early-return offline + SW update skip-offline',
    changes: [
      'Dexie v15 (lib/database.ts): nouvelle table `familyMembers` avec index composite `[familyGroupId+userId]` et `[familyGroupId+isActive]`. Migration upgrade vide Ã¢â‚¬â€ peuplÃƒÂ©e au premier appel online de getFamilyGroupMembers',
      'Helper (services/familyGroupService.ts): `verifyMembership(familyGroupId, userId)` exportÃƒÂ© Ã¢â‚¬â€ lecture Dexie d\'abord, assume true en offline si cache absent (faire confiance plutÃƒÂ´t que bloquer), tente Supabase + peuple cache si online',
      'Refactor (services/familyGroupService.ts getFamilyGroupMembers): SWR offline-first complet Ã¢â‚¬â€ lecture Dexie d\'abord (filtre familyGroupId + isActive en mÃƒÂ©moire), skip Supabase si offline (retour cache, ne throw plus), refresh + bulkPut Dexie aprÃƒÂ¨s succÃƒÂ¨s Supabase, fallback cache si erreur fetch online',
      'Fix (services/familySharingService.ts): early return offline-safe ajoutÃƒÂ© dans les 5 lectures AVANT le check membership et la requÃƒÂªte principale (tous deux online-only). Retours : `getFamilySharedTransactions` Ã¢â€ â€™ [], `getUserSharingRules` Ã¢â€ â€™ [], `shouldAutoShare` Ã¢â€ â€™ false (pas d\'auto-partage offline), `getSharedTransactionByTransactionId` Ã¢â€ â€™ null, `getSharedRecurringTransactions` Ã¢â€ â€™ []',
      'RÃƒÂ©gression v3.14.5 rÃƒÂ©solue : `getFamilySharedTransactions` ne throw plus `Vous n\'ÃƒÂªtes pas membre de ce groupe` en offline (le check membership Supabase plantait avec `ERR_INTERNET_DISCONNECTED` mÃƒÂªme quand l\'utilisateur ETAIT membre)',
      'Fix (hooks/useServiceWorkerUpdate.ts): skip `registration.update()` si `!navigator.onLine` Ã¢â‚¬â€ ÃƒÂ©limine le bruit console `Failed to update a ServiceWorker for scope` qui apparaissait ÃƒÂ  chaque cycle de polling en mode hors-ligne',
      'Reste ÃƒÂ  faire (S71 P3 ou plus tard) : 7 mutations familySharingService (shareTransaction, unshareTransaction, updateSharedTransaction, upsertSharingRule, deleteSharingRule, shareRecurringTransaction, unshareRecurringTransaction) en offline-first queue-able. Mutations familyGroupService (createFamilyGroup, joinFamilyGroup, leaveFamilyGroup) idem',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.5',
    date: '2026-05-15',
    description: 'familySharingService lectures offline-safe (5 fonctions) + favicon dans le precache PWA',
    changes: [
      'Fix (services/familySharingService.ts): helper local `getCurrentUserSafe()` ajoutÃƒÂ© (pattern S68 rÃƒÂ©pliquÃƒÂ© cf. loanService, familyGroupService, reimbursementService). Import `useAppStore` ajoutÃƒÂ©',
      'Fix (services/familySharingService.ts): 5 fonctions de lecture migrÃƒÂ©es de `supabase.auth.getUser()` (fetch rÃƒÂ©seau, throw `AuthRetryableFetchError` en offline) vers `getCurrentUserSafe()` (Zustand Ã¢â€ â€™ getSession localStorage). Fonctions concernÃƒÂ©es : `getFamilySharedTransactions` (ligne ~795), `getUserSharingRules` (~935), `shouldAutoShare` (~1153), `getSharedTransactionByTransactionId` (~1354), `getSharedRecurringTransactions` (~1436)',
      'RÃƒÂ©gression S64+ rÃƒÂ©solue : `getFamilySharedTransactions` (appelÃƒÂ©e par TransactionsPage line 251) ne throw plus "Utilisateur non authentifiÃƒÂ©" en offline. Visible dans les logs prod v3.14.3 : `familySharingService.ts:894 Erreur dans getFamilySharedTransactions` ÃƒÂ©liminÃƒÂ©',
      'Fix (index.html): remplacement de `<link rel="icon" type="image/svg+xml" href="/vite.svg" />` (asset non prÃƒÂ©cachÃƒÂ© Ã¢â€ â€™ `vite.svg net::ERR_INTERNET_DISCONNECTED` x2 au dÃƒÂ©marrage offline) par `<link rel="icon" type="image/png" href="/icon-192x192.png" />` (dÃƒÂ©jÃƒÂ  dans le precache Workbox + dÃƒÂ©jÃƒÂ  rÃƒÂ©fÃƒÂ©rencÃƒÂ© comme apple-touch-icon)',
      '7 mutations de familySharingService conservÃƒÂ©es intactes (`shareTransaction`, `unshareTransaction`, `updateSharedTransaction`, `upsertSharingRule`, `deleteSharingRule`, `shareRecurringTransaction`, `unshareRecurringTransaction`) Ã¢â‚¬â€ migration prÃƒÂ©vue en P3 (offline-first mutations queue-able)',
      'Reste ÃƒÂ  faire (S71 P1#2) : familyGroupService.getFamilyGroupMembers offline-first via nouvelle table Dexie `family_group_members` (ÃƒÂ©limine erreur "Vous n\'ÃƒÂªtes pas membre de ce groupe" en offline sur FamilyDashboardPage)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.4',
    date: '2026-05-15',
    description: 'Bruit console offline ÃƒÂ©liminÃƒÂ© Ã¢â‚¬â€ useFamilyRealtime skip WebSocket, useBudgetIntelligence skip autoCreateBudgets + loadTransactions via transactionService, recurringTransactionService.getAll skip Supabase si offline',
    changes: [
      'Fix (hooks/useFamilyRealtime.ts): les 4 fonctions subscribeToXxx (familyGroup, familyMembers, sharedTransactions, reimbursements) retournent un no-op si `useAppStore.isOnline === false`. Plus de 6 `WebSocket connection failed` au dÃƒÂ©marrage offline. isOnline mis dans les deps de useCallback Ã¢â€ â€™ les composants qui passent les callbacks en deps de useEffect recrÃƒÂ©ent la subscription au retour online (re-render naturel sur changement isOnline)',
      'Fix (hooks/useBudgetIntelligence.ts loadTransactions): remplacement de `apiService.getTransactions()` (online-only, retournait `{success: false, error: "Failed to fetch"}` en offline) par `transactionService.getTransactions()` (offline-first SWR depuis v3.10.0, retour direct IndexedDB). Plus de mapping snake_case Ã¢â€ â€™ camelCase manuel Ã¢â‚¬â€ le service le fait dÃƒÂ©jÃƒÂ ',
      'Fix (hooks/useBudgetIntelligence.ts autoCreateBudgets): early return si `!navigator.onLine`. Auparavant en offline, la crÃƒÂ©ation automatique des budgets via `apiService.createBudget()` (online-only) tentait 11 POST Supabase qui ÃƒÂ©chouaient tous avec `Failed to fetch`, polluant la console. hasAutoCreated reste ÃƒÂ  false Ã¢â€ â€™ retentative au prochain mount online',
      'Fix (services/recurringTransactionService.ts getAll): skip Supabase si `!navigator.onLine`. Auparavant la lecture de recurring_transactions (utilisÃƒÂ©e par RecurringTransactionsWidget au dashboard) tentait toujours le `supabase.from().select()` mÃƒÂªme offline, loguant `ERR_INTERNET_DISCONNECTED` x3',
      'Impact attendu (offline) : console quasi-vide Ã¢â‚¬â€ disparition d\'environ 23 erreurs au dÃƒÂ©marrage (14 useBudgetIntelligence + 6 WebSocket + 3 recurring). Tous les services mÃƒÂ©tier critiques affichent dÃƒÂ©sormais leurs donnÃƒÂ©es IndexedDB en silence',
      'Reste ÃƒÂ  faire (S71 P1) : familySharingService 12x getUser Ã¢â€ â€™ getCurrentUserSafe (erreur "Utilisateur non authentifiÃƒÂ©" dans getFamilySharedTransactions), familyGroupService.getFamilyGroupMembers offline-first via nouvelle table Dexie family_group_members',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.3',
    date: '2026-05-15',
    description: 'Pattern auth offline-safe unifiÃƒÂ© Ã¢â‚¬â€ accountService, goalService, transactionService alignÃƒÂ©s sur loanService',
    changes: [
      'Fix (services/accountService.ts): getCurrentUserId() utilise dÃƒÂ©sormais le pattern offline-safe (Zustand store Ã¢â€ â€™ getSession() Ã¢â€ â€™ null) au lieu de tomber en fallback sur supabase.auth.getUser() qui fait un fetch rÃƒÂ©seau et throw `AuthRetryableFetchError` en offline. Import ajoutÃƒÂ©: useAppStore depuis ../stores/appStore',
      'Fix (services/goalService.ts): mÃƒÂªme refonte de getCurrentUserId() Ã¢â‚¬â€ ÃƒÂ©limination du fallback supabase.auth.getUser(). CohÃƒÂ©rent avec loanService.getCurrentUserSafe()',
      'Fix (services/transactionService.ts): mÃƒÂªme refonte de getCurrentUserId() Ã¢â‚¬â€ ÃƒÂ©limination du fallback supabase.auth.getUser(). CohÃƒÂ©rent avec loanService.getCurrentUserSafe()',
      'Architecture: les 6 services mÃƒÂ©tier (loans, family, recurring, reimbursement, account, goal, transaction) utilisent dÃƒÂ©sormais le mÃƒÂªme pattern offline-safe. Plus aucun service mÃƒÂ©tier ne fait `supabase.auth.getUser()` dans ses lectures/ÃƒÂ©critures offline-first',
      'RÃƒÂ©gression S70+ silencieuse rÃƒÂ©solue: les mÃƒÂ©thodes du service (getAccounts, getGoals, getTransactions, etc.) qui tombaient sur le fallback rÃƒÂ©seau en cas de Zustand non hydratÃƒÂ© retournent dÃƒÂ©sormais directement l\'ID via getSession() (lecture localStorage Supabase, instantanÃƒÂ©e)',
      'Reste ÃƒÂ  faire (S71): familySharingService 12x getUser (lectures), familyGroupService.getFamilyGroupMembers (nouvelle table Dexie family_group_members pattern S69), useBudgetIntelligence.autoCreateBudgets (skip si offline), useFamilyRealtime (pas de WebSocket en offline), mutations BudgetsPage createBudget x3',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.2',
    date: '2026-05-11',
    description: 'Hotfix offline Ã¢â‚¬â€ page Budgets affiche dÃƒÂ©sormais les budgets et les montants dÃƒÂ©pensÃƒÂ©s en offline (lecture IndexedDB au lieu d\'apiService)',
    changes: [
      'Fix (pages/BudgetsPage.tsx loadBudgets): remplacement de `apiService.getBudgets()` (online-only, ÃƒÂ©chouait en offline avec "Failed to fetch") par `budgetService.getBudgets()` (SWR offline-first, retour direct depuis IndexedDB). Plus de mapping snake_case Ã¢â€ â€™ camelCase manuel Ã¢â‚¬â€ le service le fait dÃƒÂ©jÃƒÂ ',
      'Fix (pages/BudgetsPage.tsx calculateSpentAmounts): remplacement de `apiService.getTransactions()` par `transactionService.getTransactions()` (dÃƒÂ©jÃƒÂ  offline-first SWR depuis v3.10.0). Permet le calcul des montants dÃƒÂ©pensÃƒÂ©s (`spent`) ÃƒÂ  partir des 308+ transactions prÃƒÂ©sentes en IndexedDB',
      'RÃƒÂ©gression S70 visible rÃƒÂ©solue : la page Budgets affichait "0 budget" et "0 Ar dÃƒÂ©pensÃƒÂ©" en offline alors que 33 budgets et 308 transactions ÃƒÂ©taient prÃƒÂ©sents dans la mÃƒÂ©moire locale. La page affiche dÃƒÂ©sormais les budgets du mois sÃƒÂ©lectionnÃƒÂ© avec leurs montants dÃƒÂ©pensÃƒÂ©s calculÃƒÂ©s depuis les transactions locales',
      'Reste ÃƒÂ  faire (S71 Ã¢â‚¬â€ grand nettoyage offline) : ~22 autres endroits utilisent encore `supabase.auth.getUser()` ou des appels apiService directs en chemin critique (familySharingService 12x, getFamilyGroupMembers, accountService, goalService, useMultiYearBudgetData, useYearlyBudgetData, useBudgetIntelligence.autoCreateBudgets, mutations createBudget de BudgetsPage). Les WebSockets temps rÃƒÂ©el (useFamilyRealtime) gÃƒÂ©nÃƒÂ¨rent aussi du bruit console en offline',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.1',
    date: '2026-05-11',
    description: 'Hotfix offline Ã¢â‚¬â€ getUserFamilyGroups offline-first via cache localStorage partagÃƒÂ© entre Context et Service',
    changes: [
      'Nouveau fichier (lib/familyGroupsCache.ts): extraction des helpers `readFamilyGroupsCache` / `writeFamilyGroupsCache` / `clearFamilyGroupsCache` (auparavant dÃƒÂ©finis dans FamilyContext.tsx). Source unique partagÃƒÂ©e entre FamilyContext et familyGroupService',
      'Refactor (contexts/FamilyContext.tsx): import des helpers depuis lib/familyGroupsCache au lieu des dÃƒÂ©finitions locales (zÃƒÂ©ro rÃƒÂ©gression comportementale)',
      'Fix (services/familyGroupService.ts): getUserFamilyGroups passe en SWR offline-first. Lecture immÃƒÂ©diate du cache localStorage, retour direct si offline (`!navigator.onLine`), fallback sur cache en cas d\'ÃƒÂ©chec Supabase, mise ÃƒÂ  jour du cache aprÃƒÂ¨s chaque fetch online rÃƒÂ©ussi. Ne throw plus en cas d\'ÃƒÂ©chec Ã¢â‚¬â€ retourne le cache (potentiellement vide)',
      'RÃƒÂ©gression S69 v3.14.0 rÃƒÂ©solue : la page Transactions (et TransactionDetailPage, FamilyDashboardPage) qui appelle directement `familyGroupService.getUserFamilyGroups()` sans passer par FamilyContext peut dÃƒÂ©sormais lire le groupe familial actif en offline. Les erreurs console `TypeError: Failed to fetch` sur `family_members` disparaissent quand offline + cache prÃƒÂ©sent',
      'Limitation conservÃƒÂ©e : le premier accÃƒÂ¨s aux groupes familiaux requiert une connexion (peuple le cache localStorage). Les lectures de membres dÃƒÂ©taillÃƒÂ©s (getFamilyGroupMembers) restent online-only Ã¢â‚¬â€ refonte offline-first via tables Dexie prÃƒÂ©vue ultÃƒÂ©rieurement',
    ],
    type: 'patch' as const
  },
  {
    version: '3.14.0',
    date: '2026-05-11',
    description: 'ExpÃƒÂ©rience offline globale Ã¢â‚¬â€ dÃƒÂ©marrage instantanÃƒÂ©, Header SWR, recurringTransactionService alignÃƒÂ© sur getCurrentUserSafe',
    changes: [
      'Fix (App.tsx): loadUserFromSupabase court-circuite dÃƒÂ©sormais immÃƒÂ©diatement si `!navigator.onLine` au dÃƒÂ©marrage. Plus d\'attente de 5s sur `supabase.from(users).select()` qui ne rÃƒÂ©pondra jamais en offline. Le profil utilisateur reste celui persistÃƒÂ© par Zustand (useAppStore). Quand la connexion revient, onAuthStateChange (TOKEN_REFRESHED ou SIGNED_IN) rappelle la fonction avec rÃƒÂ©seau pour rafraÃƒÂ®chir le profil',
      'Fix (components/Layout/Header.tsx): la dÃƒÂ©tection `hasBudgets` (pour le bandeau "questionnaire prioritÃƒÂ©s") utilise dÃƒÂ©sormais `budgetService.getBudgets()` (SWR offline-first, retour IndexedDB) au lieu de `apiService.getBudgets()` (online-only, ÃƒÂ©chouait en offline et masquait le bandeau questionnaire ÃƒÂ  tort en bloquant l\'effet). Limitation acceptÃƒÂ©e : au tout premier chargement offline avec IndexedDB vide, le bandeau peut s\'afficher ÃƒÂ  tort Ã¢â‚¬â€ dismissible par l\'utilisateur',
      'Fix (services/recurringTransactionService.ts): unification du pattern auth Ã¢â‚¬â€ la mÃƒÂ©thode privÃƒÂ©e `getCurrentUserId()` dÃƒÂ©lÃƒÂ¨gue maintenant ÃƒÂ  `getCurrentUserSafe()` importÃƒÂ© depuis familyGroupService (Zustand store Ã¢â€ â€™ session Supabase Ã¢â€ â€™ null) au lieu de son ancienne implÃƒÂ©mentation `getSession() + localStorage("bazarkely-user")`. CohÃƒÂ©rent avec loanService, familyGroupService, reimbursementService',
      'Architecture: les 3 services mÃƒÂ©tier critiques (loans, family, recurring) + leurs Context React parents utilisent dÃƒÂ©sormais le mÃƒÂªme helper offline-safe `getCurrentUserSafe()`. Le dÃƒÂ©marrage de l\'app en mode offline est dÃƒÂ©sormais quasi-instantanÃƒÂ© (0ms d\'attente auth) au lieu de 5s',
      'Reste ÃƒÂ  faire (S70+) : P1#1 phase 2 reimbursementService (recordReimbursementPayment FIFO + credit balance + allocations offline-first, 2 nouvelles tables Dexie). P3 cleanup : loanStorageService dead code, unification syncManager + onlineStatusService',
    ],
    type: 'minor' as const
  },
  {
    version: '3.13.1',
    date: '2026-05-11',
    description: 'Hotfix offline Ã¢â‚¬â€ familyGroupService et FamilyContext dÃƒÂ©bloquÃƒÂ©s (getCurrentUserSafe + cache localStorage des familyGroups)',
    changes: [
      'Fix (services/familyGroupService.ts): remplacement des 9 occurrences `supabase.auth.getUser()` (qui throw `AuthRetryableFetchError` en offline) par un helper local `getCurrentUserSafe()` exportÃƒÂ© pour rÃƒÂ©utilisation. Pattern S68 rÃƒÂ©pliquÃƒÂ© sur familyGroupService',
      'Fix (contexts/FamilyContext.tsx): mÃƒÂªme substitution `supabase.auth.getUser()` Ã¢â€ â€™ `getCurrentUserSafe()` dans `fetchFamilyGroups()`. Auparavant, le seul fait de visiter une page Famille en offline dÃƒÂ©clenchait `setError("Utilisateur non authentifiÃƒÂ©")` + clear de localStorage Ã¢â€ â€™ activeFamilyGroup restait null Ã¢â€ â€™ toute la chaÃƒÂ®ne offline famille (reimbursements S69) inutilisable',
      'Feature (contexts/FamilyContext.tsx): nouveau cache localStorage des familyGroups (`bazarkely_family_groups_cache`). Lu en premier au mount (retour SWR rapide), ÃƒÂ©crit aprÃƒÂ¨s chaque fetch online rÃƒÂ©ussi, conservÃƒÂ© en cas d\'ÃƒÂ©chec rÃƒÂ©seau au lieu de wiper l\'ÃƒÂ©tat. Permet la persistance des groupes entre reloads en offline',
      'RÃƒÂ©gression dÃƒÂ©bloquÃƒÂ©e : la chaÃƒÂ®ne offline du module Famille (S69) fonctionne dÃƒÂ©sormais comme prÃƒÂ©vu Ã¢â‚¬â€ premier chargement online peuple le cache groupes + reimbursements, les visites suivantes en offline restaurent activeFamilyGroup et chargent les reimbursements depuis Dexie',
      'Limitation conservÃƒÂ©e : les mutations sur familyGroups (createFamilyGroup, joinFamilyGroup, leaveFamilyGroup) restent online-only Ã¢â‚¬â€ refonte offline-first complÃƒÂ¨te prÃƒÂ©vue en S70',
    ],
    type: 'patch' as const
  },
  {
    version: '3.13.0',
    date: '2026-05-11',
    description: 'Refonte offline-first des Remboursements Familiaux Ã¢â‚¬â€ phase 1 (lectures SWR + markAsReimbursed + getCurrentUserSafe sur 12 fonctions)',
    changes: [
      'Dexie v14 (lib/database.ts): 2 nouvelles tables locales Ã¢â‚¬â€ reimbursementRequests (avec snapshots dÃƒÂ©normalisÃƒÂ©s familyGroupId, fromMemberName, toMemberName, fromMemberUserId, toMemberUserId, transactionId/Description/Amount/Date/Category, reimbursementRate, hasReimbursementRequest) et memberCreditBalances. Migration upgrade vide',
      'Nouveau fichier (types/reimbursement.ts): ReimbursementRequestLocal + MemberCreditBalanceLocal Ã¢â‚¬â€ sources uniques des interfaces Dexie',
      'Refactor (services/reimbursementService.ts): 4 lectures critiques passent en stale-while-revalidate (IndexedDB en premier, refresh Supabase fire-and-forget). getMemberBalances (dÃƒÂ©rivÃƒÂ© localement depuis cache), getPendingReimbursements (filtre [familyGroupId+status] indexÃƒÂ©), getReimbursementStatusByTransactionIds (calcul local depuis snapshots), getMemberCreditBalance (lecture locale par [familyGroupId+fromMemberId+toMemberId])',
      'Refactor (services/reimbursementService.ts): markAsReimbursed passe en offline-first Ã¢â‚¬â€ vÃƒÂ©rification toMemberUserId locale, update Dexie immÃƒÂ©diat, push Supabase ou queue, transfert de propriÃƒÂ©tÃƒÂ© de la transaction (currentOwnerId, originalOwnerId, transferredAt) gÃƒÂ©rÃƒÂ© sÃƒÂ©parÃƒÂ©ment avec sa propre queue sur table=transactions',
      'Refactor (services/reimbursementService.ts): TOUTES les fonctions du service (12 au total, y compris celles qui restent online-only comme createReimbursementRequest, recordReimbursementPayment, getPaymentHistory, getAllocationDetails) utilisent dÃƒÂ©sormais getCurrentUserSafe() au lieu de supabase.auth.getUser() Ã¢â‚¬â€ ÃƒÂ©limine le bug "Utilisateur non authentifiÃƒÂ©" en mode offline ou pendant le warm-up de session OAuth',
      'Extend (services/syncManager.ts): nouveau case reimbursement_requests (INSERT/UPDATE/DELETE) Ã¢â‚¬â€ le syncManager traite automatiquement les mutations en attente au retour de connexion',
      'Type extension (types/index.ts): SyncOperation.table_name accepte dÃƒÂ©sormais reimbursement_requests',
      'Architecture: la vue Supabase family_member_balances reste source de vÃƒÂ©ritÃƒÂ© online pour totalPaid/totalOwed/netBalance, dÃƒÂ©rivation locale (pendingToPay/pendingToReceive uniquement) en fallback offline. Les tables reimbursement_payments / reimbursement_payment_allocations restent online-only en S69 Ã¢â‚¬â€ refonte FIFO + credit balance + allocations prÃƒÂ©vue en S70',
      'RÃƒÂ©gression S64+ rÃƒÂ©solue : la page Espace Famille affiche ses soldes et reimbursements en attente depuis Dexie aprÃƒÂ¨s un premier chargement online, sans flash "Chargement..." mÃƒÂªme hors ligne. Marquer comme rÃƒÂ©glÃƒÂ© fonctionne offline (mise ÃƒÂ  jour locale + queue de sync). Premier chargement nÃƒÂ©cessite une connexion (peuple Dexie)',
      'Reste ÃƒÂ  faire (S70) : refonte recordReimbursementPayment (FIFO, allocations, credit balance), getPaymentHistory, getAllocationDetails, getReimbursementsByMember, propagation CloudOff sur FamilyReimbursementsPage, fix familyGroupService race "Utilisateur non authentifiÃƒÂ©"',
    ],
    type: 'minor' as const
  },
  {
    version: '3.12.1',
    date: '2026-05-11',
    description: 'Hotfix offline Ã¢â‚¬â€ getCurrentUser ne plante plus en mode hors-ligne sur la page PrÃƒÂªts',
    changes: [
      'Fix (services/loanService.ts): remplacement de tous les `getCurrentUser()` (qui appelle `supabase.auth.getUser()` Ã¢â€ â€™ fetch rÃƒÂ©seau Ã¢â€ â€™ `AuthRetryableFetchError` en offline) par un helper local `getCurrentUserSafe()` qui rÃƒÂ©sout dans l\'ordre : 1) `useAppStore.user` (Zustand, sync, instantanÃƒÂ©) 2) `supabase.auth.getSession()` (lecture localStorage, pas de rÃƒÂ©seau) 3) null',
      'RÃƒÂ©gression S68 : au tout premier chargement offline, `getMyLoans()` plantait dans le catch global et retournait un tableau vide pendant 1-2 secondes avant que la session Supabase soit restaurÃƒÂ©e. La page affichait briÃƒÂ¨vement "Aucun prÃƒÂªt" alors que 11 prÃƒÂªts ÃƒÂ©taient prÃƒÂ©sents dans Dexie',
      'Impact : la page PrÃƒÂªts retourne dÃƒÂ©sormais ses donnÃƒÂ©es IndexedDB immÃƒÂ©diatement mÃƒÂªme hors-ligne, sans flash de "Aucun prÃƒÂªt" et sans tracer d\'erreur dans la console',
    ],
    type: 'patch' as const
  },
  {
    version: '3.12.0',
    date: '2026-05-11',
    description: 'Refonte offline-first du module PrÃƒÂªts Familiaux Ã¢â‚¬â€ Dexie v13 + SWR + queue de sync + indicateur CloudOff',
    changes: [
      'Dexie v13 (lib/database.ts): 4 nouvelles tables locales Ã¢â‚¬â€ personalLoans, loanRepayments, loanInterestPeriods, pendingReceipts (blobs de justificatifs en attente d\'upload). Migration upgrade vide (premier chargement online peuple les tables)',
      'Refactor complet (services/loanService.ts): toutes les lectures passent en stale-while-revalidate (IndexedDB en premier, refresh Supabase fire-and-forget). getMyLoans, getLoanById, getUnpaidInterestPeriods, getRepaymentHistory, getActiveLoansForDropdown, getLastUsedInterestSettings, getDistinctBeneficiaryNames, getUnlinkedRevenueTransactions, getTotalUnpaidInterestByLoan, getLoanIdByTransactionId, getLoanByRepaymentTransactionId, getRepaymentIndexForTransaction Ã¢â‚¬â€ toutes locales si Dexie peuplÃƒÂ©e',
      'Refactor complet (services/loanService.ts): toutes les mutations en offline-first Ã¢â‚¬â€ createLoan, updateLoanStatus, deleteLoan, recordPayment (multi-step), generateInterestPeriod, capitalizeOverdueInterests, confirmLoanAsBorrower, confirmRepaymentAsLender, mergeBeneficiaryGroups ÃƒÂ©crivent Dexie d\'abord puis tentent Supabase via withTimeout(5000), fallback queue de sync si offline ou ÃƒÂ©chec',
      'recordPayment (services/loanService.ts): nouvelle signature accepte File | string | null pour le reÃƒÂ§u. Si online Ã¢â€ â€™ upload direct vers Supabase Storage. Si offline Ã¢â€ â€™ stocke le blob dans pendingReceipts + queue l\'upload diffÃƒÂ©rÃƒÂ© (prioritÃƒÂ© LOW)',
      'Adapt (components/Loans/PaymentModal.tsx): passe le File directement ÃƒÂ  recordPayment au lieu de prÃƒÂ©-uploader Ã¢â‚¬â€ ÃƒÂ©vite la rÃƒÂ©gression "reÃƒÂ§u perdu en offline"',
      'Extend (services/syncManager.ts): switch table_name ÃƒÂ©tendu avec 4 nouveaux cases Ã¢â‚¬â€ personal_loans, loan_repayments, loan_interest_periods (INSERT/UPDATE/DELETE classiques) + pending_receipts (cas spÃƒÂ©cial : rÃƒÂ©cupÃƒÂ¨re le blob depuis Dexie, upload vers Supabase Storage, gÃƒÂ©nÃƒÂ¨re URL signÃƒÂ©e 1 an, UPDATE loan_repayments.receipt_url, supprime le pendingReceipt local)',
      'Type extension (types/index.ts): SyncOperation.table_name accepte dÃƒÂ©sormais personal_loans, loan_repayments, loan_interest_periods, pending_receipts',
      'Nouveau fichier (types/loans.ts): source unique de vÃƒÂ©ritÃƒÂ© des interfaces PersonalLoan, LoanRepayment, LoanInterestPeriod, LoanWithDetails, CreateLoanInput, UnpaidInterestSummary, PendingReceipt. RÃƒÂ©exportÃƒÂ©s depuis loanService pour rÃƒÂ©trocompatibilitÃƒÂ© des imports',
      'Feature (pages/LoansPage.tsx): icÃƒÂ´ne CloudOff (amber-500) ÃƒÂ  cÃƒÂ´tÃƒÂ© du nom du bÃƒÂ©nÃƒÂ©ficiaire pour les groupes contenant au moins un prÃƒÂªt avec opÃƒÂ©ration en attente de synchro. Re-fetch toutes les 5s pour rafraÃƒÂ®chir l\'indicateur quand le syncManager vide la queue au retour online',
      'Architecture: la source de vÃƒÂ©ritÃƒÂ© online est dÃƒÂ©sormais useAppStore.isOnline (cohÃƒÂ©rent S67), avec fallback navigator.onLine. Le syncManager existant traite automatiquement les nouvelles tables au retour de connexion',
      'RÃƒÂ©gression S64+ rÃƒÂ©solue : la page PrÃƒÂªts fonctionne complÃƒÂ¨tement hors ligne (consultation + crÃƒÂ©ation + modification + remboursement + suppression + fusion bÃƒÂ©nÃƒÂ©ficiaires). Premier chargement nÃƒÂ©cessite une connexion (peuple Dexie)',
      'Reste ÃƒÂ  faire : reimbursementService (paiements remboursements familiaux, FIFO, credit balance) Ã¢â‚¬â€ prÃƒÂ©vu en session suivante. Indicateur sync sur la page Famille ÃƒÂ  propager en mÃƒÂªme temps',
    ],
    type: 'minor' as const
  },
  {
    version: '3.11.0',
    date: '2026-05-10',
    description: 'DÃƒÂ©tection online unifiÃƒÂ©e (events navigator + Page Visibility + ping 2min) + page Objectifs en SWR + timeout sur getServerStatus',
    changes: [
      'Refactor (goalService.ts): getGoals() passe en stale-while-revalidate Ã¢â‚¬â€ IndexedDB lu en premier (retour immÃƒÂ©diat), Supabase rafraÃƒÂ®chit IndexedDB en arriÃƒÂ¨re-plan (fire-and-forget) pour la prochaine lecture. CohÃƒÂ©rent avec transactionService S66',
      'Fix (goalService.ts): si IndexedDB est vide au premier usage, fetch Supabase synchrone avec timeout 5s Ã¢â‚¬â€ fallback gracieux vers tableau vide en cas d\'ÃƒÂ©chec',
      'Fix (apiService.ts): getServerStatus() wrappÃƒÂ© avec withTimeout(5000) Ã¢â‚¬â€ ÃƒÂ©limine le risque de hang du polling de statut online',
      'Refactor (services/onlineStatusService.ts): nouveau service centralisÃƒÂ© Ã¢â‚¬â€ ÃƒÂ©vÃƒÂ©nements navigator online/offline (rÃƒÂ©action instantanÃƒÂ©e), Page Visibility API (pause polling onglet cachÃƒÂ©), ping serveur backup toutes les 2 min (au lieu de 30s)',
      'Refactor (hooks/useOnlineStatus.ts): devient un simple lecteur de useAppStore.isOnline Ã¢â‚¬â€ plus de polling local',
      'Refactor (Header.tsx): suppression du state local isOnline + useEffect dupliquÃƒÂ© Ã¢â€ â€™ utilise useOnlineStatus() comme HeaderUserBanner',
      'Refactor (App.tsx): remplacement du useEffect basique online/offline par initOnlineStatusService() Ã¢â‚¬â€ un seul point d\'init pour toute l\'app',
      'Architecture: source unique de vÃƒÂ©ritÃƒÂ© = useAppStore.isOnline (alimentÃƒÂ© par onlineStatusService) ; useSyncStore.isOnline mis ÃƒÂ  jour en parallÃƒÂ¨le pour rÃƒÂ©trocompat',
      'Ãƒâ€°conomie data : ping pause auto quand onglet cachÃƒÂ© + intervalle passÃƒÂ© de 30s ÃƒÂ  120s ; ~95% de la dÃƒÂ©tection online est dÃƒÂ©sormais event-based (instantanÃƒÂ©e) au lieu de polling',
    ],
    type: 'minor' as const
  },
  {
    version: '3.10.0',
    date: '2026-05-10',
    description: 'Offline-first robuste Ã¢â‚¬â€ transactions en stale-while-revalidate + timeouts 5s sur tous les services mÃƒÂ©tier',
    changes: [
      'Refactor (transactionService.ts): getTransactions() passe en stale-while-revalidate Ã¢â‚¬â€ IndexedDB lu en premier (retour immÃƒÂ©diat), Supabase rafraÃƒÂ®chit IndexedDB en arriÃƒÂ¨re-plan (fire-and-forget) pour la prochaine lecture. Fini les spinners infinis quand Supabase rame',
      'Fix (transactionService.ts): si IndexedDB est vide au premier usage, fetch Supabase synchrone avec timeout 5s Ã¢â‚¬â€ fallback gracieux vers tableau vide en cas d\'ÃƒÂ©chec',
      'Hardening (transactionService.ts, accountService.ts, budgetService.ts, goalService.ts): tous les appels apiService.* sont dÃƒÂ©sormais wrappÃƒÂ©s avec withTimeout(5000) Ã¢â‚¬â€ ÃƒÂ©limine le risque de hang quand Supabase rame mais Wi-Fi est OK',
      'Pattern: SUPABASE_TIMEOUT_MS = 5000 (cohÃƒÂ©rent avec authService et App.tsx) ajoutÃƒÂ© dans chaque service mÃƒÂ©tier',
      'Architecture: les composants UI ne voient aucune diffÃƒÂ©rence de signature Ã¢â‚¬â€ la fiabilitÃƒÂ© offline est amÃƒÂ©liorÃƒÂ©e de maniÃƒÂ¨re transparente',
      'Documentation: ETAT-TECHNIQUE-COMPLET.md section "Ã°Å¸â€â€ž SYNCHRONISATION ET OFFLINE" entiÃƒÂ¨rement rÃƒÂ©ÃƒÂ©crite avec audit datÃƒÂ© du 2026-05-10 (5 services, 7 ÃƒÂ©crans, 8 problÃƒÂ¨mes priorisÃƒÂ©s, plan de remÃƒÂ©diation)',
      'CLAUDE.md: ajout RÃƒË†GLE #0bis "Questions fermÃƒÂ©es par sÃƒÂ©ries" comme skill projet Ã¢â‚¬â€ protocole de cadrage avant toute action',
      'Note: P1 #1 (loanService 100% Supabase-only) reste ÃƒÂ  faire dans une session ultÃƒÂ©rieure Ã¢â‚¬â€ voir audit',
    ],
    type: 'minor' as const
  },
  {
    version: '3.9.0',
    date: '2026-05-05',
    description: 'Modal QuickTopUp Ã¢â‚¬â€ ravitaillement de compte au solde insuffisant',
    changes: [
      'Feature (QuickTopUpModal.tsx): nouvelle modal proposÃƒÂ©e quand le solde est insuffisant lors d\'une dÃƒÂ©pense, prÃƒÂªt accordÃƒÂ© ou remboursement de dette Ã¢â‚¬â€ l\'utilisateur peut transfÃƒÂ©rer depuis un autre de ses comptes sans quitter le formulaire',
      'Feature (AddTransactionPage.tsx): bouton "Ravitailler le compte X" apparaÃƒÂ®t dans le bandeau d\'erreur "Solde insuffisant" Ã¢â‚¬â€ ouvre la modal avec destination verrouillÃƒÂ©e et montant prÃƒÂ©-rempli au shortfall',
      'Feature (QuickTopUpModal.tsx): destination verrouillÃƒÂ©e, montant minimum = shortfall, calcul auto des frais, rÃƒÂ©sumÃƒÂ© dÃƒÂ©bit/nouveau solde, garde-fou "solde source insuffisant"',
      'Architecture: rÃƒÂ©utilisation de transactionService.createTransfer + feeService.calculateFees Ã¢â‚¬â€ aucune duplication de logique mÃƒÂ©tier, logique transfert canonique prÃƒÂ©servÃƒÂ©e dans /transfer',
      'UX: pas de navigation cross-page Ã¢â‚¬â€ le formulaire de dÃƒÂ©pense reste montÃƒÂ©, ses champs (montant, catÃƒÂ©gorie, bÃƒÂ©nÃƒÂ©ficiaire, prÃƒÂªt liÃƒÂ©) sont prÃƒÂ©servÃƒÂ©s automatiquement, accountService.getAccounts() rafraÃƒÂ®chit les soldes aprÃƒÂ¨s succÃƒÂ¨s',
    ],
    type: 'minor' as const
  },
  {
    version: '3.8.1',
    date: '2026-05-04',
    description: 'Fix sortie immÃƒÂ©diate du mode ancre au relÃƒÂ¢chement du doigt',
    changes: [
      'Fix (LoansPage.tsx): le mode ancre se dÃƒÂ©sactivait dÃƒÂ¨s `onPointerUp` parce que `isAnchor` venait juste de devenir `true` (long-press timer venait de tirer). Le relÃƒÂ¢chement ÃƒÂ©tait traitÃƒÂ© comme un tap-sur-ancre Ã¢â€ â€™ exit immÃƒÂ©diat',
      'Fix (LoansPage.tsx): ajout d\'un useRef `longPressFiredRef` qui marque quand le timer a tirÃƒÂ© pendant la pression en cours Ã¢â‚¬â€ `onPointerUp` ne sort du mode que si c\'est un VRAI tap court (pas la fin du long-press lui-mÃƒÂªme)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.8.0',
    date: '2026-05-03',
    description: 'Fusion manuelle de bÃƒÂ©nÃƒÂ©ficiaires (anchor + cible) sur LoansPage + autocomplete HTML5 sur crÃƒÂ©ation de prÃƒÂªt',
    changes: [
      'Feature (LoansPage.tsx): mode "ancre" via appui long sur l\'avatar d\'un groupe Ã¢â‚¬â€ les autres avatars deviennent des cases ÃƒÂ  cocher (sÃƒÂ©lection unique, anti-erreur)',
      'Feature (LoansPage.tsx): bouton "Fusionner" apparaÃƒÂ®t ÃƒÂ  droite du groupe cochÃƒÂ© Ã¢â‚¬â€ ouvre un dialog de confirmation listant le nombre de prÃƒÂªts renommÃƒÂ©s et la transition de nom',
      'Feature (MergeBeneficiariesDialog.tsx): warnings explicites quand les tÃƒÂ©lÃƒÂ©phones diffÃƒÂ¨rent ou quand il s\'agit de deux utilisateurs distincts de l\'app',
      'Feature (loanService.ts): mergeBeneficiaryGroups Ã¢â‚¬â€ rÃƒÂ©ÃƒÂ©crit borrower_name + borrower_user_id + borrower_phone sur les prÃƒÂªts cibles (anchor wins) ; gÃƒÂ¨re aussi le cas userIsBorrower (lender_name + lender_user_id)',
      'Feature (AddTransactionPage.tsx): datalist HTML5 sur le champ "Nom du bÃƒÂ©nÃƒÂ©ficiaire" Ã¢â‚¬â€ la liste se filtre au fil de la saisie pour ÃƒÂ©viter de recrÃƒÂ©er un nom lÃƒÂ©gÃƒÂ¨rement diffÃƒÂ©rent',
      'Feature (loanService.ts): getDistinctBeneficiaryNames Ã¢â‚¬â€ alimente le datalist avec les noms uniques (borrower + lender) dÃƒÂ©jÃƒÂ  utilisÃƒÂ©s par l\'utilisateur',
    ],
    type: 'minor' as const
  },
  {
    version: '3.7.0',
    date: '2026-05-03',
    description: 'Refonte page PrÃƒÂªts Familiaux Ã¢â‚¬â€ regroupement par bÃƒÂ©nÃƒÂ©ficiaire + panneau de dÃƒÂ©tail alignÃƒÂ© sur TransactionsPage',
    changes: [
      'Feature (LoansPage.tsx): les prÃƒÂªts ÃƒÂ  un mÃƒÂªme bÃƒÂ©nÃƒÂ©ficiaire sont dÃƒÂ©sormais regroupÃƒÂ©s dans un seul conteneur avec montant total restant et statut consolidÃƒÂ© (pire statut: late > pending > active > closed)',
      'Feature (LoansPage.tsx): panneau de dÃƒÂ©tail alignÃƒÂ© sur TransactionsPage Ã¢â‚¬â€ carte gradient violet, header "Details transaction" + X, carte Montant avec barre de progression RemboursÃƒÂ©/Restant + %, carte Notes, carte Informations prÃƒÂªt + IntÃƒÂ©rÃƒÂªts dus',
      'Feature (LoansPage.tsx): bouton Modifier ajoutÃƒÂ© Ã¢â‚¬â€ navigue vers /transaction/:transactionId avec autoEdit (ÃƒÂ©dite la transaction d\'origine du prÃƒÂªt)',
      'Feature (LoansPage.tsx): conversion devise dans le total agrÃƒÂ©gÃƒÂ© Ã¢â‚¬â€ prÃƒÂªts EUR convertis en MGA via getExchangeRate (fallback 4950) puis affichÃƒÂ©s selon displayCurrency',
      'Refactor (loanService.ts): ajout du champ lenderName dans PersonalLoan + mapLoanRow lit row.lender_name (la colonne existe en DB mais n\'ÃƒÂ©tait pas mappÃƒÂ©e)',
    ],
    type: 'minor' as const
  },
  {
    version: '3.6.1',
    date: '2026-04-26',
    description: 'Fix saisie et ÃƒÂ©dition du solde de compte en mode EUR Ã¢â‚¬â€ dÃƒÂ©cimales autorisÃƒÂ©es et conversion EURÃ¢â€ â€™MGA au stockage',
    changes: [
      'Fix (AddAccountPage.tsx): le champ "Solde initial" autorise dÃƒÂ©sormais les dÃƒÂ©cimales (step="0.01") quand la devise d\'affichage est EUR Ã¢â‚¬â€ auparavant step="1" rejetait toute valeur dÃƒÂ©cimale ("018,50" invalide)',
      'Fix (AddAccountPage.tsx): conversion EURÃ¢â€ â€™MGA via getExchangeRate (fallback 4950) avant appel ÃƒÂ  createAccount Ã¢â‚¬â€ les soldes restent stockÃƒÂ©s en MGA conformÃƒÂ©ment ÃƒÂ  la convention de useFormatBalance',
      'Fix (AccountDetailPage.tsx): ÃƒÂ©dition du solde Ã¢â‚¬â€ prÃƒÂ©-remplit le champ avec la valeur convertie dans la devise d\'affichage et reconvertit en MGA ÃƒÂ  la sauvegarde, label dynamique (EUR/MGA), step="0.01" en EUR',
      'Robustesse: timeout 5s sur la rÃƒÂ©cupÃƒÂ©ration du taux via withTimeout, fallback DEFAULT_RATE 4950 cohÃƒÂ©rent avec useFormatBalance',
    ],
    type: 'patch' as const
  },
  {
    version: '3.6.0',
    date: '2026-04-13',
    description: 'Fix conversion devise globale Ã¢â‚¬â€ tous les montants MGA respectent la devise d\'affichage',
    changes: [
      'Nouveau hook useFormatBalance : convertit les montants MGA au taux du jour quand displayCurrency=EUR, rÃƒÂ©utilisable dans toute l\'app',
      'Fix (AccountDetailPage.tsx): solde du compte converti correctement en EUR',
      'Fix (AddTransactionPage.tsx): dropdown comptes et message "solde insuffisant" Ã¢â‚¬â€ montants convertis',
      'Fix (DashboardPage.tsx): total prÃƒÂªts actifs converti en EUR',
      'Fix (TransactionsPage.tsx): 7 montants de prÃƒÂªts/remboursements convertis en EUR',
      'Fix (ReimbursementPaymentModal.tsx): 6 montants allocations/acomptes convertis en EUR',
      'Refactoring (TransferPage.tsx): logique locale remplacÃƒÂ©e par le hook partagÃƒÂ© useFormatBalance',
    ],
    type: 'minor' as const
  },
  {
    version: '3.5.15',
    date: '2026-04-13',
    description: 'Fix conversion devise dans page transfert entre comptes',
    changes: [
      'Fix (TransferPage.tsx): les soldes des comptes dans les dropdowns source/destination sont maintenant convertis au taux du jour quand la devise d\'affichage est EUR Ã¢â‚¬â€ auparavant seul le symbole Ã¢â€šÂ¬ ÃƒÂ©tait affichÃƒÂ© sans conversion',
      'Fix (TransferPage.tsx): le message d\'erreur "solde insuffisant" affiche aussi le montant converti correctement',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.14',
    date: '2026-04-13',
    description: 'Fix boucle infinie rechargement Service Worker',
    changes: [
      'Fix (useServiceWorkerUpdate.ts): le rechargement auto sur controllerchange ne se dÃƒÂ©clenche que si l\'utilisateur a cliquÃƒÂ© "Mettre ÃƒÂ  jour" Ã¢â‚¬â€ ÃƒÂ©vite la boucle infinie avec DevTools "Update on reload"',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.13',
    date: '2026-04-13',
    description: 'Bandeau mise ÃƒÂ  jour affichÃƒÂ© uniquement en mode PWA standalone',
    changes: [
      'Fix (UpdatePrompt.tsx): le bandeau "Nouvelle version disponible" ne s\'affiche plus en navigateur desktop Ã¢â‚¬â€ uniquement quand l\'app est installÃƒÂ©e en PWA',
      'Fix (AppVersionPage.tsx): la section "Statut de mise ÃƒÂ  jour" affiche "Mode navigateur" avec instruction de recharger la page au lieu du bouton de mise ÃƒÂ  jour SW',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.12',
    date: '2026-04-13',
    description: 'Hardening auth Ã¢â‚¬â€ timeout 5s sur toutes les requÃƒÂªtes DB users',
    changes: [
      'Fix (authService.ts): toutes les requÃƒÂªtes supabase.from("users") utilisent maintenant withTimeout(5000) Ã¢â‚¬â€ login(), handleOAuthCallback(), waitForUserProfile(), getCurrentUser()',
      'Fix (authService.ts): waitForUserProfile() rÃƒÂ©duit ÃƒÂ  5 tentatives (au lieu de 10) avec timeout par requÃƒÂªte',
      'Pattern: les requÃƒÂªtes DB Supabase peuvent hanger silencieusement Ã¢â€ â€™ toujours utiliser withTimeout() dans les chemins critiques',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.11',
    date: '2026-04-13',
    description: 'Fix connexion Google Ã¢â‚¬â€ timeout 5s sur requÃƒÂªte DB users',
    changes: [
      'Fix (App.tsx): loadUserFromSupabase() Ã¢â‚¬â€ la requÃƒÂªte Supabase users table ne throwait pas, elle hangait indÃƒÂ©finiment. Ajout d\'un Promise.race() avec timeout 5s : aprÃƒÂ¨s 5s sans rÃƒÂ©ponse, setAuthenticated(true) est appelÃƒÂ© via le catch, la session reste valide',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.10',
    date: '2026-04-13',
    description: 'Fix connexion Google Ã¢â‚¬â€ detectSessionInUrl false',
    changes: [
      'Fix (supabase.ts): detectSessionInUrl: true causait un conflit avec captureOAuthTokens() Ã¢â‚¬â€ le client Supabase traitait les tokens du hash en parallÃƒÂ¨le de setSession(), bloquant ce dernier indÃƒÂ©finiment',
      'Fix: dÃƒÂ©sactivÃƒÂ© detectSessionInUrl car main.tsx gÃƒÂ¨re dÃƒÂ©jÃƒÂ  la capture manuelle des tokens OAuth',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.9',
    date: '2026-04-13',
    description: 'Fix connexion Google Ã¢â‚¬â€ bypass waitForUserProfile bloquant',
    changes: [
      'Fix (AuthPage.tsx): authService.handleOAuthCallback() appelait waitForUserProfile() qui pollait la table users sans timeout Ã¢â‚¬â€ si la connexion DB traÃƒÂ®nait, le flux OAuth restait bloquÃƒÂ© indÃƒÂ©finiment sur Chargement...',
      'Fix (AuthPage.tsx): remplacÃƒÂ© par navigation directe aprÃƒÂ¨s setSession() Ã¢â‚¬â€ profil complet chargÃƒÂ© par App.tsx SIGNED_IN handler de maniÃƒÂ¨re asynchrone',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.8',
    date: '2026-04-13',
    description: 'Fix connexion Google Ã¢â‚¬â€ setAuthenticated aprÃƒÂ¨s erreur rÃƒÂ©seau',
    changes: [
      'Fix (App.tsx): loadUserFromSupabase() appelait setAuthenticated(true) uniquement dans le cas succÃƒÂ¨s/profil absent, mais PAS dans le bloc catch Ã¢â‚¬â€ si la requÃƒÂªte Supabase ÃƒÂ©chouait, l\'utilisateur restait bloquÃƒÂ© indÃƒÂ©finiment sur la page d\'authentification',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.7',
    date: '2026-04-13',
    description: 'Fix connexion Google Ã¢â‚¬â€ approche auth simplifiÃƒÂ©e',
    changes: [
      'Fix (App.tsx): Retour ÃƒÂ  getSession() dans initializeApp() SANS appel setAuthenticated(false) Ã¢â‚¬â€ prÃƒÂ©serve le flux OAuth Google existant tout en ÃƒÂ©vitant la boucle de rechargement',
      'Fix (App.tsx): Suppression du handler INITIAL_SESSION qui bloquait le callback Google OAuth',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.6',
    date: '2026-04-13',
    description: 'Fix connexion Google bloquÃƒÂ©e',
    changes: [
      'Fix (supabase.ts): Suppression du timeout global fetch 8s Ã¢â‚¬â€ avortait setSession() OAuth sans rejeter la promesse Ã¢â€ â€™ isLoading bloquÃƒÂ© sur true indÃƒÂ©finiment',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.5',
    date: '2026-04-12',
    description: 'Fix boucle de chargement Ã¢â‚¬â€ INITIAL_SESSION auth',
    changes: [
      'Fix (App.tsx): onAuthStateChange INITIAL_SESSION comme source de vÃƒÂ©ritÃƒÂ© auth Ã¢â‚¬â€ ÃƒÂ©limine flash isAuthenticated falseÃ¢â€ â€™true qui causait remontage du Dashboard en boucle',
      'Fix (App.tsx): Suppression setUser(null) dans initializeApp() Ã¢â‚¬â€ ÃƒÂ©vite kick vers /auth pendant refresh token Supabase',
      'Fix (supabase.ts): Timeout global 8s sur toutes les requÃƒÂªtes Supabase Ã¢â‚¬â€ empÃƒÂªche blocage infini sur rÃƒÂ©seau lent',
      'Fix (authService.ts): Nettoyage localStorage avant signOut Supabase Ã¢â‚¬â€ dÃƒÂ©connexion garantie mÃƒÂªme hors ligne',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.4',
    date: '2026-04-12',
    description: 'Fix cause racine du dashboard bloquÃƒÂ© Ã¢â‚¬â€ dÃƒÂ©pendance useEffect sur userId au lieu de user',
    changes: [
      'Fix: useEffect([user]) remplacÃƒÂ© par useEffect([userId]) dans DashboardPage Ã¢â‚¬â€ Supabase appelait setUser() 2x au dÃƒÂ©marrage (getSession + onAuthStateChange SIGNED_IN), chaque appel crÃƒÂ©ait une nouvelle rÃƒÂ©fÃƒÂ©rence objet, re-dÃƒÂ©clenchant le fetch et annulant le prÃƒÂ©cÃƒÂ©dent via cancelled=true',
      'Fix: MÃƒÂªme correction appliquÃƒÂ©e aux 3 useEffects (notifications, donnÃƒÂ©es, prÃƒÂªts)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.3',
    date: '2026-04-12',
    description: 'Fix robuste du dashboard bloquÃƒÂ© en chargement (intermittent)',
    changes: [
      'Fix: scheduleTransactionWatch retirÃƒÂ© du chemin critique (ÃƒÂ©tait await dans une boucle Ã¢â‚¬â€ bloquait le finally si rÃƒÂ©seau lent)',
      'Fix: Flag cancelled ajoutÃƒÂ© pour ignorer les mises ÃƒÂ  jour d\'un fetch devenu obsolÃƒÂ¨te (exÃƒÂ©cutions concurrentes)',
      'Fix: Timeout de sÃƒÂ©curitÃƒÂ© 10s Ã¢â‚¬â€ isLoading forcÃƒÂ© ÃƒÂ  false quoi qu\'il arrive',
      'Fix: Script bump-version.js converti en ESM (ÃƒÂ©tait cassÃƒÂ© depuis passage type:module)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.2',
    date: '2026-04-12',
    description: 'Correction du dashboard bloquÃƒÂ© sur "Chargement..." et du bouton DÃƒÂ©connexion inaccessible',
    changes: [
      'Fix: Dashboard - Race condition sur les setInterval de notifications empÃƒÂªchant le chargement des donnÃƒÂ©es (ajout clearInterval dans le cleanup)',
      'Fix: Dashboard - setIsLoading(false) manquant quand aucun utilisateur connectÃƒÂ© Ã¢â€ â€™ blocage infini rÃƒÂ©solu',
      'Fix: Dashboard - Cartes Solde/Revenus/DÃƒÂ©penses/Budget affichaient 0 pendant le chargement Ã¢â€ â€™ skeleton animÃƒÂ© ajoutÃƒÂ©',
      'Fix: Header - Bouton DÃƒÂ©connexion inaccessible car dropdown positionnÃƒÂ© hors zone cliquable Ã¢â€ â€™ wrapper relative corrigÃƒÂ©'
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.1',
    date: '2026-03-07',
    description: 'Loans Transaction View S54',
    changes: [
      'Feature: Loan acknowledgment system - WhatsApp confirmation link',
      'Feature: Public /loan-confirm/:token page',
      'Feature: borrowerPhone in AddTransactionPage',
      'Refactor: Remove CreateLoanModal'
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.0',
    date: '2026-03-09',
    description: 'Double validation prÃƒÂªts - badge ATTENTE CONFIRMATION, split LoansPage 1044LÃ¢â€ â€™407L, confirmation emprunteur/prÃƒÂªteur',
    changes: [
      'Double validation prÃƒÂªts - badge ATTENTE CONFIRMATION, split LoansPage 1044LÃ¢â€ â€™407L, confirmation emprunteur/prÃƒÂªteur'
    ],
    type: 'minor' as const
  },
  {
    version: '3.0.0',
    date: '2026-02-15',
    changes: [
      'Feature: Module Prets Familiaux Phase 1+2 - SystÃƒÂ¨me complet de gestion des prÃƒÂªts personnels',
      'Feature: Page LoansPage.tsx - Interface de gestion des prÃƒÂªts avec sections "J\'ai prÃƒÂªtÃƒÂ©" et "J\'ai empruntÃƒÂ©"',
      'Feature: CreateLoanModal - Modal de crÃƒÂ©ation de prÃƒÂªt avec gestion taux d\'intÃƒÂ©rÃƒÂªt, frÃƒÂ©quences, et ÃƒÂ©chÃƒÂ©ances',
      'Feature: PaymentModal - Enregistrement de paiements (direct ou liÃƒÂ© ÃƒÂ  transaction) avec calcul intÃƒÂ©rÃƒÂªts courus',
      'Feature: RepaymentHistorySection - Historique des remboursements avec accordÃƒÂ©on collapsible',
      'Feature: LoanCard expansion - Cartes de prÃƒÂªt cliquables avec dÃƒÂ©tails ÃƒÂ©tendus (paiements, historique)',
      'Feature: IntÃƒÂ©gration loanService.ts - Service complet pour CRUD prÃƒÂªts, paiements, et calculs d\'intÃƒÂ©rÃƒÂªts',
      'Technical: Architecture modulaire - Composants modaux extraits au niveau top-level pour ÃƒÂ©viter re-mount',
      'Technical: Gestion ÃƒÂ©tat avancÃƒÂ©e - selectedLoanId, showPaymentModal pour contrÃƒÂ´le expansion et modals',
      'UI Enhancement: Badges de statut (pending, active, late, closed) avec couleurs distinctes',
      'UI Enhancement: Barres de progression pour visualisation remboursement',
      'UI Enhancement: Affichage multi-devises (MGA/EUR) avec CurrencyDisplay',
      'Session: Module Prets Familiaux Phase 1+2 complÃƒÂ¨te'
    ],
    type: 'major' as const
  },
  {
    version: '2.8.1',
    date: '2026-02-12',
    changes: [
      'Cleanup: Removed 17 debug console.log statements from ReimbursementPaymentModal.tsx and FamilyReimbursementsPage.tsx',
      'Session: S48 (2026-02-12) - Debug cleanup patch'
    ],
    type: 'patch' as const
  },
  {
    version: '2.8.0',
    date: '2026-02-12',
    changes: [
      'Feature: Collapsible Payment History - Payment history section now collapsible for better UI organization',
      'Feature: Progress Bars in Allocation Preview - Visual progress bars showing allocation distribution across requests',
      'Feature: Amount Parsing Fix - Improved amount parsing logic for better accuracy in payment processing',
      'Feature: Payment Status Indicators - Visual indicators showing payment status (pending, settled, partial)',
      'UI Enhancement: Better organization of payment information with collapsible sections',
      'UI Enhancement: Visual feedback for payment allocations with progress bars',
      'Technical: Enhanced amount parsing for multi-currency support',
      'Technical: Payment status tracking improvements',
      'Session: S44 (2026-02-12) - Payment allocation UI enhancements'
    ],
    type: 'minor' as const
  },
  {
    version: '2.7.0',
    date: '2026-01-27',
    changes: [
      'Feature: Budget Gauge AddTransaction - Affichage temps rÃƒÂ©el jauge budgÃƒÂ©taire lors sÃƒÂ©lection catÃƒÂ©gorie dÃƒÂ©pense',
      'Feature: Budget Gauge AddTransaction - Affichage pourcentage utilisÃƒÂ© et montant restant en temps rÃƒÂ©el',
      'Feature: useBudgetGauge hook - CrÃƒÂ©ation hook custom avec logique rÃƒÂ©active (fetch budget, calcul spent, statut)',
      'Feature: useBudgetGauge hook - RÃƒÂ©activitÃƒÂ© automatique sur changements category/amount/date',
      'Feature: BudgetGauge component - Composant prÃƒÂ©sentationnel avec layout inline (barre et texte mÃƒÂªme ligne)',
      'Feature: BudgetGauge component - Barre de progression bicolore (vert + rouge) si dÃƒÂ©passement budgÃƒÂ©taire',
      'Feature: BudgetGauge component - Couleurs dynamiques selon statut (vert bon, jaune attention, rouge dÃƒÂ©passÃƒÂ©)',
      'Feature: getBudgetByCategory service - Extension budgetService avec mÃƒÂ©thode rÃƒÂ©cupÃƒÂ©ration budget par catÃƒÂ©gorie/mois/annÃƒÂ©e',
      'Feature: getBudgetByCategory service - Pattern offline-first via getBudgets() existant',
      'Feature: Layout optimisations - 4 itÃƒÂ©rations pour layout optimal (label gauche, gauge extensible, texte droite)',
      'Feature: Layout optimisations - Structure flex-1 pour extension complÃƒÂ¨te barre entre label et texte',
      'Feature: Logique Ãƒâ€°pargne inversÃƒÂ©e - Statut inversÃƒÂ© pour catÃƒÂ©gorie Ãƒâ€°pargne (0% = dÃƒÂ©passÃƒÂ© rouge, 100% = bon vert)',
      'Feature: Conversion multi-devises - Conversion EUR vers MGA utilisant exchangeRateUsed stockÃƒÂ© dans transactions',
      'Feature: Masquage automatique - Jauge masquÃƒÂ©e si type Revenu ou catÃƒÂ©gorie vide',
      'Feature: Gestion ÃƒÂ©tats - Loading, error, no-budget states gÃƒÂ©rÃƒÂ©s avec messages informatifs',
      'Technical: Architecture modulaire - Service-hook-component-integration pattern rÃƒÂ©utilisable',
      'Technical: Matching case-insensitive - Comparaison catÃƒÂ©gories normalisÃƒÂ©e pour robustesse',
      'Technical: Mobile prÃƒÂ©servÃƒÂ© 100% - ZÃƒÂ©ro rÃƒÂ©gression mobile confirmÃƒÂ©',
      'Documentation: README.md, ETAT-TECHNIQUE-COMPLET.md, PROJECT-STRUCTURE-TREE.md, FEATURE-MATRIX.md, CURSOR-2.0-CONFIG.md mis ÃƒÂ  jour',
      'Workflow: Multi-agent workflows utilisÃƒÂ©s (Agents 01, 02, 03, 04, 05, 06, 09, 10, 11, 12)',
      'Workflow: Documentation 5-agents parallÃƒÂ¨les (NOUVEAU pattern) - Gain temps 70%',
      'Session: S43 (2026-01-27) - Budget Gauge Feature complÃƒÂ¨te'
    ],
    type: 'minor' as const
  },
  {
    version: '2.6.0',
    date: '2026-01-26',
    changes: [
      'Feature: Desktop Enhancement - Layout 2 colonnes desktop (main 70% + sidebar 30%)',
      'Feature: Desktop Enhancement - Header 2 lignes avec navigation intÃƒÂ©grÃƒÂ©e (6 liens: Accueil, Comptes, Transactions, Budgets, Famille, Objectifs)',
      'Feature: Desktop Enhancement - Sidebar sticky avec clearance optimale (lg:sticky lg:top-40)',
      'Feature: Desktop Enhancement - BottomNav cachÃƒÂ© desktop, visible mobile (lg:hidden)',
      'Feature: Desktop Enhancement - 3 composants layout crÃƒÂ©ÃƒÂ©s (DashboardContainer, ResponsiveGrid, ResponsiveStatCard)',
      'Feature: Desktop Enhancement - Grille statistiques responsive (2 colonnes mobile Ã¢â€ â€™ 4 colonnes desktop)',
      'Feature: Desktop Enhancement - Padding responsive sur cartes statistiques (p-4 md:p-6 lg:p-8)',
      'Feature: Desktop Enhancement - Actions rapides layout flex horizontal desktop (lg:flex lg:justify-center)',
      'Fix: Import path case sensitivity - Correction layout Ã¢â€ â€™ Layout pour compatibilitÃƒÂ© Linux/Netlify',
      'Technical: Architecture multi-agents - 3 approches testÃƒÂ©es (conservative, modulaire, intÃƒÂ©grÃƒÂ©e)',
      'Technical: Approche intÃƒÂ©grÃƒÂ©e retenue pour meilleure UX desktop',
      'Technical: Mobile prÃƒÂ©servÃƒÂ© 100% - ZÃƒÂ©ro rÃƒÂ©gression mobile',
      'Documentation: README.md, ETAT-TECHNIQUE-COMPLET.md, GAP-TECHNIQUE-COMPLET.md mis ÃƒÂ  jour',
      'Workflow: Multi-agent workflows utilisÃƒÂ©s (Agents 09, 10, 11)',
      'Session: S42 (2026-01-26) - Desktop Enhancement complÃƒÂ¨te'
    ],
    type: 'minor' as const
  },
  {
    version: '2.5.0',
    date: '2026-01-25',
    changes: [
      'Feature: Infrastructure i18n Multi-Langues (Phase 1/3) - SystÃƒÂ¨me react-i18next opÃƒÂ©rationnel',
      'Feature: Configuration i18n.ts avec dÃƒÂ©tection automatique langue depuis appStore',
      'Feature: Support 3 langues: FranÃƒÂ§ais, English, Malagasy',
      'Feature: Fichiers traduction fr.json, en.json, mg.json (85+ clÃƒÂ©s section auth)',
      'Feature: Provider I18nextProvider intÃƒÂ©grÃƒÂ© dans App.tsx',
      'Feature: Protection Anti-Traduction - SÃƒÂ©curisation donnÃƒÂ©es financiÃƒÂ¨res',
      'Feature: Utility excludeFromTranslation.tsx (10 fonctions utilitaires)',
      'Feature: CurrencyDisplay protÃƒÂ©gÃƒÂ© automatiquement (44+ fichiers)',
      'Feature: Protection multi-couches: translate="no", notranslate, lang, data attributes',
      'Fix: Dashboard EUR Display - Correction originalCurrency hardcodÃƒÂ© "MGA" Ã¢â€ â€™ transaction.originalCurrency',
      'Fix: Dashboard EUR Display - Utilisation transaction.originalAmount pour montants corrects',
      'Fix: Dashboard EUR Display - RÃƒÂ©sultat: 100,00 EUR affichÃƒÂ© correctement (au lieu de 0,20 EUR)',
      'Fix: i18next Initialization Error - Correction pattern new LanguageDetector() Ã¢â€ â€™ LanguageDetector direct',
      'Technical: Configuration dÃƒÂ©tection langue via getAppStoreLanguage()',
      'Technical: Application charge sans erreur i18n',
      'Documentation: README.md, ETAT-TECHNIQUE-COMPLET.md, GAP-TECHNIQUE-COMPLET.md, FEATURE-MATRIX.md mis ÃƒÂ  jour',
      'Workflow: 13 agents multi-agents utilisÃƒÂ©s (7 workflows parallÃƒÂ¨les, 70% temps ÃƒÂ©conomisÃƒÂ©)',
      'Session: S41 (2026-01-25) - Infrastructure i18n Phase 1 complÃƒÂ¨te'
    ],
    type: 'minor' as const
  },
  {
    version: '2.4.10',
    date: '2026-01-24',
    changes: [
      'Fix: Version synchronization between package.json and appVersion.ts',
      'Deployment: Force Netlify deployment for documentation updates'
    ],
    type: 'patch' as const
  },
  {
    version: '2.4.9',
    date: '2026-01-23',
    changes: [
      'UI Optimization: Header spacing reduced in search container (mt-4 p-4 Ã¢â€ â€™ mt-2 p-3) for more compact interface',
      'UI Optimization: Connection status layout changed from horizontal to vertical centered (icon above text)',
      'UI Optimization: Reduced vertical spacing between icon and text (space-y-2 Ã¢â€ â€™ space-y-1) for compact display',
      'Technical: Modified Header.tsx line 918: mt-2 p-3 classes',
      'Technical: Modified Header.tsx line 963: flex flex-col items-center justify-center space-y-1',
      'Technical: Modified Header.tsx line 969: added text-center to span',
      'Design System: mt-2 p-3 pattern used 3x in project for consistency',
      'Layout Pattern: flex flex-col items-center used 7x in project',
      'Session: S41 (2026-01-23) - Header UI optimizations'
    ],
    type: 'patch' as const
  },
  {
    version: '2.4.8',
    date: '2026-01-21',
    changes: [
      'Bug Fix: CurrencyDisplay HTML Nesting - Fixed invalid HTML structure causing currency toggle malfunction',
      'Bug Fix: Changed wrapper element from <div> to <span> for HTML5 compliance',
      'Bug Fix: Resolved validation errors when CurrencyDisplay used inside <p> or <button> tags',
      'Bug Fix: AccountsPage Button Nesting - Fixed button-in-button HTML error blocking currency toggle',
      'Bug Fix: Replaced <button> parent with <div role="button"> for accessibility',
      'Enhancement: Currency Toggle for Especes Accounts - Enabled currency conversion for cash accounts',
      'Enhancement: Removed conditional rendering that excluded especes accounts from CurrencyDisplay',
      'Technical: HTML5 Compliance - All CurrencyDisplay usages now pass HTML validation',
      'Technical: Accessibility - Enhanced keyboard navigation for account cards',
      'Validation: 30 CurrencyDisplay instances validated (100% pass rate, 0 regressions)',
      'Documentation: Updated ETAT-TECHNIQUE-COMPLET.md, GAP-TECHNIQUE-COMPLET.md, FEATURE-MATRIX.md',
      'Session: S40 (2026-01-21) - Multi-agent fix (AGENT 09, 10, 11, 12)',
      'Commit: dd55724 - 6 files modified (+408 / -43 lines)'
    ],
    type: 'patch' as const
  },
  {
    version: '2.4.7',
    date: '2026-01-20',
    changes: [
      'Fix: EUR double conversion bug in TransactionsPage',
      'Fix: EUR transactions now display correctly with global currency toggle',
      'Fix: 100 EUR correctly shows as 495,000 Ar (not 2,450,250,000 Ar)',
      'Technical: Pass originalAmount directly to CurrencyDisplay',
      'Technical: Eliminate double conversion in transaction display logic'
    ],
    type: 'patch' as const
  },
  {
    version: '2.4.6',
    date: '2026-01-18',
    changes: [
      'Major Feature: Complete multi-currency support - Accounts can now hold both EUR and MGA transactions',
      'PROMPT 1: Modified account schema to support multi-currency (currency field now optional/nullable)',
      'PROMPT 1: Accounts with currency=null accept transactions in any currency',
      'PROMPT 2: Transaction services now capture originalCurrency from form currency toggle',
      'PROMPT 2: Exchange rates retrieved at transaction date (not current date)',
      'PROMPT 2: Store originalAmount, originalCurrency, exchangeRateUsed for every transaction',
      'PROMPT 3: Created currencyConversion.ts utility with convertAmountWithStoredRate()',
      'PROMPT 3: Display logic uses stored exchangeRateUsed (never recalculates with current rate)',
      'PROMPT 3: Transaction amounts convert correctly based on /settings displayCurrency',
      'PROMPT 3: Created WalletBalanceDisplay component for dual currency display (X Ã¢â€šÂ¬ + Y Ar)',
      'PROMPT 4: TransferPage and AddTransactionPage now pass originalCurrency from form toggle',
      'PROMPT 4: Form submission logs show currency source (form toggle, not /settings)',
      'PROMPT 5: Fixed currency toggle button - clicking Ar/Ã¢â€šÂ¬ symbol now switches currency correctly',
      'PROMPT 5: Added setDisplayCurrency call in onCurrencyChange handlers',
      'PROMPT 5: Comprehensive debug logs for currency toggle flow',
      'PROMPT 6: Fixed transfer display bug - debit transactions now show red arrow out, credit show green arrow in',
      'PROMPT 6: Display logic uses transaction.amount (original) instead of converted amount for icon determination',
      'Bug Fix: Replaced toast.warning() with toast() (react-hot-toast compatibility)',
      'Architecture: Currency in /settings is UI display preference only, not account constraint',
      'Architecture: Form currency toggle determines transaction originalCurrency, independent of /settings',
      'Architecture: Historical exchange rates preserved in exchangeRateUsed field',
      'Testing: Verified EURÃ¢â€ â€™EUR transfers maintain 100Ã¢â€šÂ¬ without unwanted conversion',
      'Breaking Change: None - Fully backward compatible with existing accounts and transactions'
    ]
  },
  {
    version: '2.4.5',
    date: '2026-01-18',
    changes: [
      'Bug Fix: EUR transfer bug - amounts no longer incorrectly converted when transferring between EUR accounts',
      'STEP 1: Added multi-currency columns to Supabase transactions table (original_currency, original_amount, exchange_rate_used)',
      'STEP 1: Regenerated TypeScript types to match new Supabase schema',
      'STEP 1: Created migration SQL: supabase/migrations/20260118134130_add_multi_currency_columns_to_transactions.sql',
      'STEP 2: Fixed fallback MGA bug in transactionService.ts - removed || "MGA" fallback that caused incorrect conversions',
      'STEP 2: Added strict currency validation - transfers now require both accounts to have explicit currency defined',
      'STEP 2: Enhanced logging in createTransfer() - comprehensive debugging logs for currency validation and conversion',
      'STEP 3: Added frontend validation in TransferPage.tsx - early detection of currency issues before service call',
      'STEP 3: Added currency mismatch warnings - toast notifications inform user of display currency vs account currency differences',
      'STEP 3: Improved error messages - user-friendly error handling with actionable next steps',
      'Root Cause: Fallback to MGA when account.currency was undefined caused EUR amounts to be treated as MGA and incorrectly converted',
      'Impact: Transfers between EUR accounts now preserve original amounts without unwanted currency conversion',
      'Testing: Recommended to test EURÃ¢â€ â€™EUR, MGAÃ¢â€ â€™MGA, and cross-currency EURÃ¢â€ â€™MGA transfers'
    ]
  },
  {
    version: '2.5.0',
    date: '2026-01-07',
    changes: [
      'Phase B Complete: Automatic goal deadline synchronization based on requiredMonthlyContribution',
      'Phase B1: Added requiredMonthlyContribution field to Goal schema (TypeScript + IndexedDB v12 + Supabase)',
      'Phase B2: Created centralized recalculateDeadline() function in goalService',
      'Phase B3.1: Persist requiredMonthlyContribution when accepting suggestions',
      'Phase B3.2: Auto-recalculate deadline on goal creation',
      'Phase B3.3: Auto-recalculate deadline when contribution or target amount changes',
      'Phase B3.4: One-time migration to sync existing goals with outdated deadlines',
      'Formula: deadline = today + ceil((targetAmount - currentAmount) / requiredMonthlyContribution) months',
      'Edge cases handled: goal achieved, no contribution, duration limits (1-120 months)',
      'Backward compatible: manual deadlines preserved if no requiredMonthlyContribution'
    ]
  },
  {
    version: '2.4.3',
    date: '2026-01-02',
    changes: [
      'Fix: Projection graphique Goals recalculÃƒÂ©e selon contribution mensuelle',
      'Fix: Jours restants affiche durÃƒÂ©e rÃƒÂ©aliste (360j au lieu de 1825j)',
      'Fix: Suggestion mensualitÃƒÂ© conservative (15% au lieu de 30%)',
      'AmÃƒÂ©lioration: calculateRealisticContribution avec min 5% / max 25%'
    ]
  },
  { version: '2.4.2', date: '2025-01-02', changes: 'Flux ÃƒÂ©pargne intelligent, bouton suggÃƒÂ©rer objectifs, fix PGRST116/PGRST204, conversion camelCaseÃ¢â€ â€™snake_case' },
  { version: '2.4.1', date: '2025-01-02', changes: 'Graphique ÃƒÂ©volution ÃƒÂ©pargne, systÃƒÂ¨me cÃƒÂ©lÃƒÂ©brations jalons' },
  { version: '2.4.0', date: '2025-01-01', changes: 'Widget Dashboard objectifs, suggestions automatiques' }
];
