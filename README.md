# Anime Tierlist

Crée une tierlist, façon TierMaker, à partir de ta liste d'animés AniList ou MyAnimeList : classe tes **animés**, leurs **openings**, leurs **endings** ou leurs **insert songs**, écoute les musiques directement sur la page, puis sauvegarde ou partage le résultat en image.

**👉 [Ouvrir le site](https://propleek.github.io/animelisttiermaker/)**

Aucune inscription, aucune installation : tout se passe dans le navigateur.

## Fonctionnalités

- **Import de ta liste** en tapant simplement ton pseudo AniList, ou depuis un export XML MyAnimeList : le site affiche le nombre d'animés et leur répartition par statut.
- **Quatre types de tierlist :** animés, openings, endings ou insert songs (les chansons diffusées pendant les épisodes).
- **Filtre par statut** (Completed, Watching, Dropped…) pour ne classer que ce que tu veux.
- **Couvertures récupérées automatiquement** pour chaque animé.
- **Écoute des musiques :** chaque opening ou ending a un bouton ▶, et une barre de lecture permet la pause, de se déplacer dans le morceau et de régler le volume.
- **Glisser-déposer** à la souris, au clavier ou au doigt sur mobile (appui long sur une carte).
- **Tiers personnalisables :** renommer, changer la couleur, ajouter, supprimer ou réordonner les lignes.
- **Tiers repliables**, pour garder une vue compacte des très grandes tierlists : un tier replié affiche seulement son nombre de cartes et accepte toujours qu'on y dépose des cartes.
- **Recherche** dans les cartes non classées, par titre d'animé, titre de chanson ou artiste.
- **Sauvegarde en fichier JSON**, pour reprendre ta tierlist plus tard exactement où tu l'avais laissée.
- **Export en image PNG**, prête à partager : en-tête avec ton pseudo, le type de tierlist et la date ; titre et artiste visibles sur chaque musique.

## Utilisation

### 1. Importer ta liste

- **Depuis AniList :** tape ton pseudo AniList et clique sur *Importer*. Ta liste doit être publique (c'est le réglage par défaut d'AniList). Le site retient le dernier pseudo utilisé.
- **Depuis MyAnimeList :** MyAnimeList ne permet pas à un site comme celui-ci de lire ta liste directement, il faut passer par un export. Menu de ton profil → *Import/Export* → *Export My List* → *Export Anime List*. Le fichier téléchargé est compressé (`.xml.gz`) : décompresse-le pour obtenir le `.xml` (clic droit → *Extraire*, ou avec 7-Zip), puis dépose-le sur le site (ou clique sur *Choisir un fichier*).

### 2. Créer la tierlist

1. Clique sur *Continuer*, choisis le type de tierlist (**Animés**, **Openings**, **Endings** ou **Insert songs**) et les statuts à inclure.
2. Clique sur *Créer la tierlist*. Le premier chargement prend quelques secondes ; les suivants sont quasi instantanés.

### 3. Classer

- Glisse les cartes de la zone **Non classés** vers les tiers. Tu peux aussi les réordonner dans un tier, ou les renvoyer dans la réserve.
- **Échap** annule un déplacement en cours.
- À droite de chaque tier : **▲ / ▼** pour le déplacer, **−** pour le replier (**+** pour le déplier), **⚙** pour le renommer, changer sa couleur ou le supprimer. Une carte déposée sur un tier replié s'ajoute à la fin de ce tier. L'image PNG montre toujours tous les tiers dépliés.
- *+ Ajouter un tier* crée une nouvelle ligne ; *Réinitialiser* renvoie toutes les cartes dans la réserve.
- En mode Openings, Endings ou Insert songs, **▶** sur une carte lance la musique.

### 4. Sauvegarder et partager

- **Sauvegarder (JSON)** télécharge un fichier contenant toute ta tierlist. Pour la reprendre, dépose ce fichier `.json` sur la page d'accueil du site : elle s'ouvre directement.
- **Exporter (PNG)** télécharge une image de la tierlist, sans la réserve ni les boutons.
- Un indicateur signale les modifications non sauvegardées, et le navigateur te prévient si tu fermes la page avant de sauvegarder.

## D'où viennent les données ?

| Données | Source |
|---|---|
| Liste d'un utilisateur AniList, couvertures des animés | [AniList](https://anilist.co) |
| Liste des openings, endings et insert songs | [AnisongDB](https://anisongdb.com) |
| Fichiers audio | [Anime Music Quiz](https://animemusicquiz.com) |

Le site n'a pas de serveur : ta liste est lue **dans ton navigateur** et n'est envoyée nulle part. Seuls ton pseudo (pour l'import AniList) et les identifiants et titres des animés sont transmis à AniList et AnisongDB, pour récupérer ta liste, les couvertures et les musiques. Les réponses sont mises en cache dans ton navigateur pour accélérer les visites suivantes.

## Limites connues

- **Animés sans musique :** certains n'ont pas d'opening ou d'ending (films, épisodes spéciaux), d'autres sont absents d'AnisongDB ou y sont enregistrés sous un autre nom. Ils sont listés dans un encadré au-dessus de la tierlist.
- **Animés très récents :** quand seule la vidéo est disponible, c'est sa piste son qui est lue. Le fichier est plus lourd, mais la lecture démarre tout de suite.
- **Connexion requise** pour charger les couvertures et écouter les musiques.

## Crédits

Merci à AniList, AnisongDB et Anime Music Quiz, dont les données rendent ce site possible. Les musiques et les illustrations appartiennent à leurs ayants droit respectifs ; ce site est un projet personnel sans but commercial.

Réalisé avec React, Vite, dnd-kit et html-to-image.
