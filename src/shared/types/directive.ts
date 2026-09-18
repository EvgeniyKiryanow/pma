/** Orders (розпорядження), exclusions (виключення) and restorations (відновлення). */
export const DIRECTIVE_TYPES = ['order', 'exclude', 'restore'] as const;

export type DirectiveType = (typeof DIRECTIVE_TYPES)[number];

export type DirectivePeriod = { from: string; to: string };

export type DirectiveInput = {
    userId: number;
    type: DirectiveType;
    title: string;
    description?: string;
    file: any;
    date: string;
    period?: { from: string; to?: string };
};

export type DirectiveRecord = {
    id: number;
    userId: number;
    type: DirectiveType;
    title: string;
    description?: string;
    file: any;
    date: string;
    period: DirectivePeriod;
};
