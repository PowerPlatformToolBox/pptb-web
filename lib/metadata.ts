import type { Metadata } from "next";

import icon from "@/images/icon.png";

const previewImageUrl = icon?.src ?? "/logo.png";
const previewImage = {
    url: previewImageUrl,
    width: icon.width,
    height: icon.height,
    alt: "Power Platform ToolBox preview image",
};

const defaultTwitterCard = "summary_large_image" as const;

export const defaultOpenGraph: NonNullable<Metadata["openGraph"]> = {
    type: "website",
    images: [previewImage],
};

export const defaultTwitter: NonNullable<Metadata["twitter"]> = {
    card: defaultTwitterCard,
    images: [previewImageUrl],
};

interface PageMetadataOptions {
    title: string;
    description: string;
    url?: string;
    keywords?: string[];
    alternates?: Metadata["alternates"];
}

export function buildPageMetadata({ title, description, url, keywords, alternates }: PageMetadataOptions): Metadata {
    return {
        title,
        description,
        keywords,
        alternates,
        openGraph: {
            ...defaultOpenGraph,
            title,
            description,
            url,
        },
        twitter: {
            ...defaultTwitter,
            title,
            description,
        },
    };
}

export const sharedPreviewImage = previewImage;
export const sharedPreviewImageUrl = previewImageUrl;
