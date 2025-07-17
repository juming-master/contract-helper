export declare const mapSkip: unique symbol;
export type Mapper<Element, NewElement> = (element: Element, index: number) => Promise<NewElement | typeof mapSkip> | NewElement | typeof mapSkip;
export type Options = {
    concurrency?: number;
    stopOnError?: boolean;
    signal?: AbortSignal;
};
export default function map<Element, NewElement>(input: Iterable<Element | Promise<Element>> | AsyncIterable<Element | Promise<Element>>, mapper: Mapper<Element, NewElement>, options?: Options): Promise<Array<Exclude<NewElement, typeof mapSkip>>>;
//# sourceMappingURL=p-map.d.ts.map