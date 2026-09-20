# Astronomie pour Gladys Assistant

Cette intégration calcule, pour votre maison, ce qui se passe dans le ciel :
les prochaines éclipses, les planètes visibles ce soir, les pluies d'étoiles
filantes, la fenêtre de ciel noir sans Lune, les saisons et une prévision
d'aurores. Tout est calculé **localement**, sans clé ni compte : la seule
connexion sortante est le service de météo spatiale de la NOAA pour l'indice
Kp des aurores, et elle peut être désactivée.

Six appareils apparaissent dans Gladys, chacun avec des capteurs texte (lisibles
sur le tableau de bord) et des capteurs numériques (utilisables dans les scènes,
avec seuils et historique).

## Prérequis

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

- **Sortir observer** : quand « Ciel noir maintenant » passe à 1 et que « Pluie
  en cours » vaut 1, envoyer un message avec le texte « Pluie active ».
- **Ne pas rater l'éclipse** : si « Éclipse solaire dans » descend sous 1 jour,
  envoyer le texte « Prochaine éclipse solaire » chaque matin.
- **Alerte aurores** : quand « Alerte aurores » passe à 1, ou que « Kp max sur
  24 h » dépasse 6, prévenir et éteindre les lumières extérieures.
- **Éclairage extérieur** : couper les lumières du jardin pendant la fenêtre sans
  Lune quand le score de la nuit dépasse 8.
- **Saisons** : quand « Prochaine saison dans » vaut 0, annoncer l'équinoxe.

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
