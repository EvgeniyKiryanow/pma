import type { AwardKind } from '../awards/catalog';

/** An award of the unit's own register (brigade, battalion, local, public…). */
export type AwardType = {
    uuid: string;
    name: string;
    kind: AwardKind;
    /** Who awards it: the default of «Від кого». */
    awardedBy: string;
    /** Degrees, highest first ('I', 'II'…); empty when it has none. */
    degrees: string[];
    /** The order that established it (number, date). */
    established: string;
    /** What it is given for. */
    notes: string;
    /** No longer awarded: hidden when adding, still shown where it was given. */
    retired: boolean;
};

export type AwardTypeInput = Omit<AwardType, 'uuid'> & { uuid?: string };
