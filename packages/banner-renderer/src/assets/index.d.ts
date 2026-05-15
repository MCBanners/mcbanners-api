export declare const assetKindValues: readonly ["font", "background-template", "sprite"];
export type AssetKind = (typeof assetKindValues)[number];
export declare const supportedAssetExtensions: readonly [".png", ".ttf"];
export type SupportedAssetExtension = (typeof supportedAssetExtensions)[number];
export interface AssetReference {
  readonly key: string;
  readonly kind: AssetKind;
  readonly relativePath: string;
  readonly sha256: string;
  readonly extension: SupportedAssetExtension;
  readonly required: boolean;
  readonly byteSize: number;
  readonly legacySourcePath: string;
  readonly role?: string;
}
export interface AssetManifest {
  readonly version: 1;
  readonly policy: {
    readonly copiedIntoRepo: boolean;
    readonly hashAlgorithm: "sha256";
    readonly validateOnStartup: boolean;
  };
  readonly assets: readonly AssetReference[];
}
export interface LoadedAssetRegistry {
  readonly fonts: ReadonlyMap<string, AssetReference>;
  readonly backgroundTemplates: ReadonlyMap<string, AssetReference>;
  readonly sprites: ReadonlyMap<string, AssetReference>;
}
export declare const rendererAssetManifest: {
  readonly version: 1;
  readonly policy: {
    readonly copiedIntoRepo: true;
    readonly hashAlgorithm: "sha256";
    readonly validateOnStartup: true;
  };
  readonly assets: readonly [
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference,
    AssetReference
  ];
};
export declare class AssetValidationError extends Error {
  readonly issues: readonly string[];
  constructor(issues: readonly string[]);
}
export declare const resolveAssetPath: (
  assetReference: Pick<AssetReference, "relativePath">
) => string;
export declare const computeAssetSha256: (filePath: string) => Promise<string>;
export declare const validateAssetManifest: (manifest?: AssetManifest) => AssetManifest;
export declare const validateAssetFiles: (manifest?: AssetManifest) => Promise<AssetManifest>;
//# sourceMappingURL=index.d.ts.map
