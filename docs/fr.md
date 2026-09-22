# Astronomie pour Gladys Assistant

Cette intégration calcule, pour votre maison, ce qui se passe dans le ciel :
les prochaines éclipses, les planètes visibles ce soir, les pluies d'étoiles
filantes, la fenêtre de ciel noir sans Lune, les saisons et une prévision
d'aurores. Tout est calculé **localement**, sans clé ni compte : la seule
connexion sortante est le service de météo spatiale de la NOAA pour l'indice
Kp des aurores, et elle peut être désactivée.

L'intégration apporte trois choses :

- **six appareils** avec des capteurs texte et numériques, historisés et utilisables
  dans les scènes avec des seuils ;
- **quatre widgets** de tableau de bord, affichés dans la langue de chaque utilisateur ;
- **six déclencheurs et deux actions de scène** : « une éclipse commence », « le ciel
  noir commence », « quel est le prochain événement ? »…

## Prérequis

- **Gladys 5.1 ou plus récent** : les widgets et les scènes d'intégrations externes
  sont apparus dans cette version.
- **Une maison localisée dans Gladys** : Paramètres → Maisons → votre maison →
  placez le repère sur la carte. L'intégration lit ces coordonnées (elle demande
  l'accès `location` à l'installation). Vous pouvez aussi saisir latitude et
  longitude à la main dans la configuration, pour observer depuis un autre lieu.
- **Le fuseau horaire de Gladys** : Paramètres → Système. Les heures des capteurs
  texte sont affichées dans ce fuseau ; s'il n'est pas réglé, elles sont en UTC.

## Les six appareils

| Appareil               | Ce qu'il donne                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Éclipses**           | Prochaine éclipse solaire visible de chez vous (type, obscuration, heures de début, maximum et fin), prochaine éclipse lunaire visible (type, heures, période où la Lune est levée), prochain transit de Mercure ou Vénus, compte à rebours en jours, drapeau « éclipse aujourd'hui ».                                                                          |
| **Planètes**           | Planètes visibles à l'œil nu cette nuit avec leur magnitude, leurs heures et leur constellation ; la plus brillante ; prochaine conjonction (Lune–planète ou planète–planète), sa séparation et si elle est observable ; prochaine opposition ou élongation maximale.                                                                                           |
| **Étoiles filantes**   | Pluie active (ZHR, heure du pic, gêne de la Lune, hauteur du radiant), drapeaux « pluie en cours » et « pic cette nuit », prochain pic avec son ZHR et l'illumination de la Lune. Calendrier embarqué de 13 pluies annuelles (Quadrantides, Lyrides, Êta Aquarides, Delta Aquarides, Perséides, Draconides, Orionides, Taurides, Léonides, Géminides, Ursides). |
| **Nuit d'observation** | Crépuscules civil, nautique et astronomique, aube astronomique, fenêtre de ciel noir sans Lune (début, durée), drapeau « ciel noir maintenant », score de qualité du ciel de 0 à 10 (instantané et meilleur de la nuit), illumination de la Lune.                                                                                                               |
| **Saisons et orbite**  | Prochain équinoxe ou solstice, durée du jour et sa variation quotidienne, prochain périhélie ou aphélie, distance Terre-Soleil.                                                                                                                                                                                                                                 |
| **Aurores**            | Indice Kp actuel, maximum à 24 h et 72 h, niveau d'alerte de 0 à 3, drapeau d'alerte, prochaine période au-dessus de votre seuil, prévision sur trois jours, date de la dernière mise à jour NOAA.                                                                                                                                                              |

Les capteurs « type » (`partial`, `total`, `september-equinox`…) portent des
valeurs neutres, identiques dans toutes les langues, pour être testées dans les
scènes.

## Widgets du tableau de bord

Dans l'édition d'un tableau de bord, choisissez **Ajouter une box → Widgets
d'intégrations**.

| Widget                | Ce qu'il montre                                                                                                                                                                                                              | Réglages                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Cette nuit**        | Courbe de la qualité du ciel sur toute la nuit, avec crépuscule, nuit noire, début du ciel sans Lune et aube ; jauge du ciel maintenant ; heure et durée de la fenêtre sans Lune ; Lune ; planètes visibles et pluie active. | aucun                                                |
| **Agenda du ciel**    | Les huit prochains événements, chacun avec un badge « J-12 » et un panneau de détail : éclipses, pics d'étoiles filantes, conjonctions, oppositions, élongations, saisons, transits.                                         | types d'événements, période (30 jours, 3 mois, 1 an) |
| **Aurores**           | Kp actuel, max 24 h et 72 h colorés selon le seuil, histogramme observé et prévu, niveau d'alerte et fraîcheur des données NOAA.                                                                                             | aucun                                                |
| **Prochaine éclipse** | Compte à rebours, obscuration, hauteur de l'astre au maximum, heure de chaque phase.                                                                                                                                         | la prochaine, solaire ou lunaire                     |

Les conjonctions sont cherchées sur la fenêtre choisie dans la configuration (90 jours
par défaut) : sur la période « 1 an », l'agenda n'en montre pas au-delà.

## Déclencheurs et actions de scène

Dans l'éditeur de scène, catégorie **Intégrations** :

| Déclencheur                    | Quand                                                  | Filtre possible                  |
| ------------------------------ | ------------------------------------------------------ | -------------------------------- |
| Début ou maximum d'éclipse     | au début de la phase visible, puis au maximum          | Soleil ou Lune, début ou maximum |
| Début du ciel noir sans Lune   | quand la fenêtre sans Lune commence                    | —                                |
| Pic d'étoiles filantes ce soir | au crépuscule de la nuit d'un pic                      | la pluie (Perséides, Géminides…) |
| Conjonction visible ce soir    | au crépuscule de la nuit d'un rapprochement observable | avec ou sans la Lune             |
| Alerte aurores en hausse       | quand le niveau d'alerte monte                         | le niveau atteint                |
| Début d'une saison             | à l'instant de l'équinoxe ou du solstice               | la saison                        |

Chaque déclencheur transmet ses informations aux actions suivantes (heure du maximum,
ZHR, séparation, Kp, description prête à envoyer…), à insérer avec le sélecteur de
variables.

Deux actions renvoient des valeurs aux étapes suivantes : **Prochain événement du
ciel** (filtrable par type) et **Résumé du ciel de cette nuit**. Elles ont leur propre
champ de langue, car une scène n'a pas d'utilisateur.

Les déclencheurs horaires sont émis par le conteneur de l'intégration : s'il est
arrêté à l'heure dite, un événement manqué de moins de 15 minutes est rattrapé à son
redémarrage, au-delà il est abandonné.

## Configuration

- **Langue des textes** : français ou anglais. Les noms de capteurs sont fixés à
  la création de l'appareil ; pour les renommer après un changement de langue,
  supprimez puis rajoutez l'appareil.
- **Rafraîchissement des comptes à rebours** : cadence des valeurs qui bougent
  (jours restants, drapeaux, score instantané). Les événements rares sont
  recalculés chaque nuit à 03:00, la nuit toutes les 30 minutes, les aurores
  toutes les 30 minutes.
- **Conjonctions** : fenêtre de recherche et séparation maximale. La pleine
  Lune fait 0,5° ; 3° est un rapprochement joli à l'œil nu.
- **ZHR minimal** : masque les petites pluies. 10 garde les Draconides, Léonides
  et Ursides ; 50 ne garde que les Perséides, Géminides et Êta Aquarides.
- **Fenêtre sans Lune** : une Lune plus fine que ce pourcentage ne gâche pas le
  ciel noir.
- **Classe de Bortle** : pollution lumineuse de votre site (1 ciel pur, 9
  centre-ville). Abaisse le score de qualité du ciel ; 0 l'ignore.
- **Aurores** : activez ou non l'appareil NOAA, et le Kp à partir duquel
  l'alerte se lève. Kp 5 correspond à un orage mineur (aurores possibles vers
  55° de latitude), Kp 7 peut atteindre le centre de la France.

## Idées de scènes

- **Nuit des Perséides** : déclencheur « Pic d'étoiles filantes ce soir » filtré sur
  les Perséides, puis un message contenant la description transmise.
- **Ne pas rater l'éclipse** : déclencheur « Début ou maximum d'éclipse », phase
  « Début » : prévenir tout le monde et ouvrir les volets côté ciel.
- **Ciel noir** : déclencheur « Début du ciel noir sans Lune » : couper l'éclairage du
  jardin si le meilleur score transmis dépasse 8.
- **Alerte aurores** : déclencheur « Alerte aurores en hausse », niveau « Orage fort ».
  Pour un seuil précis (Kp > 6), utilisez plutôt le capteur « Kp max sur 24 h » de
  l'appareil Aurores dans un déclencheur d'état d'appareil.
- **Bonsoir astronomique** : chaque soir à 20 h, action « Résumé du ciel de cette
  nuit » puis un message avec le résumé.

## À savoir

- Le lever et le coucher du Soleil sont déjà natifs dans Gladys : ils ne sont
  pas dupliqués ici.
- Les éclipses lunaires pénombrales, quasiment invisibles, sont ignorées.
- Une éclipse solaire est retenue si le Soleil est au-dessus de l'horizon à son
  maximum ; une éclipse lunaire si la Lune est levée pendant sa phase d'ombre.
- Les pics des pluies d'étoiles filantes sont calculés à partir de la longitude
  solaire publiée par l'International Meteor Organization ; ils peuvent
  différer de quelques heures des prévisions détaillées de l'année.
- Aux hautes latitudes en été, il n'y a pas de nuit astronomique : la fenêtre
  se replie sur le crépuscule nautique, puis civil. Au-delà du cercle polaire,
  les capteurs de nuit affichent « — ».
- Les constellations sont nommées en latin (Gemini, Leo…), la convention
  internationale.

## Dépannage

- **« Aucune coordonnée »** : localisez votre maison dans Gladys ou saisissez
  latitude et longitude dans la configuration, puis enregistrez.
- **Heures décalées** : réglez le fuseau horaire dans Paramètres → Système, puis
  cliquez « Recalculer maintenant ».
- **Aurores « Indisponible »** : la NOAA ne répond pas ; le bouton « Tester le
  service NOAA » affiche l'erreur exacte. Les dernières valeurs restent servies
  six heures depuis le cache, l'appareil est alors marqué dégradé.
