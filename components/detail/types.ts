import type {
  LibraryItemExpanded,
  MediaProgress,
  PodcastEpisode,
  SeriesSequence,
} from '~/api/models';

/** Author reference as returned in expanded book metadata. */
export type AuthorRef = {
  id?: string;
  name?: string;
};

type ExpandedMedia = NonNullable<LibraryItemExpanded['media']>;
type ExpandedMetadata = NonNullable<ExpandedMedia['metadata']>;

/**
 * The orval-generated types miss several fields the real ABS server returns on
 * `GET /api/items/{id}?expanded=1&include=progress` — authors/series arrays,
 * plain-text description, podcast episodes and the user's media progress.
 * This type layers the validated response shape (ABS 2.32.1) on top.
 */
export type ItemDetailMetadata = ExpandedMetadata & {
  authors?: AuthorRef[];
  series?: SeriesSequence[];
  descriptionPlain?: string | null;
};

export type ItemDetail = Omit<LibraryItemExpanded, 'media'> & {
  media?: Omit<ExpandedMedia, 'metadata'> & {
    metadata?: ItemDetailMetadata;
    /** Present for podcasts only. */
    episodes?: PodcastEpisode[];
  };
  userMediaProgress?: MediaProgress | null;
};

/**
 * Minified library item metadata as returned by the series-filtered
 * `/api/libraries/{id}/items` endpoint — `series` is collapsed to the single
 * matching series sequence object.
 */
export type SeriesFilteredMetadata = {
  title?: string | null;
  authorName?: string;
  series?: SeriesSequence | null;
};
