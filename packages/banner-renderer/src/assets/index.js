import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
export const assetKindValues = ["font", "background-template", "sprite"];
export const supportedAssetExtensions = [".png", ".ttf"];
const legacyResourceRoot = "../banner-api/src/main/resources";
const assetRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../assets");
const asset = (kind, key, relativePath, byteSize, sha256, role) => ({
    key,
    kind,
    relativePath,
    sha256,
    extension: extname(relativePath),
    required: true,
    byteSize,
    legacySourcePath: `${legacyResourceRoot}/${relativePath}`,
    ...(role === undefined ? {} : { role })
});
export const rendererAssetManifest = {
    version: 1,
    policy: {
        copiedIntoRepo: true,
        hashAlgorithm: "sha256",
        validateOnStartup: true
    },
    assets: [
        asset("background-template", "BLUE_RADIAL", "banner/blue_radial.png", 435, "3e4af017eb080f000270a53f1348f01c828c7daedd840045d4af999f39f6e9ab"),
        asset("background-template", "BURNING_ORANGE", "banner/burning_orange.png", 357, "460c8d2c611f1c0040a261bbc4517082385b5abfd328b3c9f8c78560c91e4dca"),
        asset("background-template", "DARK_GUNMETAL", "banner/dark_gunmetal.png", 456, "2bee94a6ea901955941d89483a8d8bfaff32659e985df9128d7ae3d80472eff6"),
        asset("background-template", "LIGHT_MODE", "banner/light_mode.png", 133, "da8be4a2a33d43d577c8a7e71f6cd202a5d4f1caf573a3aade362f944b1a91bb"),
        asset("background-template", "MALACHITE_GREEN", "banner/malachite_green.png", 456, "953265a12b12b79707aafab60ccc6b0839f5ca370d6f9dc33c6846d5a452d97d"),
        asset("background-template", "MANGO", "banner/mango.png", 328, "294c44c01e5a517692551868e27b002468c316dc0ce98a17a878212f2d13470f"),
        asset("background-template", "MOONLIGHT_PURPLE", "banner/moonlight_purple.png", 421, "cfbedfff2f71553e1db7fc49a0ee6ebcc70511f9823c05b3079e5997c572c631"),
        asset("background-template", "ORANGE_RADIAL", "banner/orange_radial.png", 5_923, "c9889d78af54b933c7ec4f1610dc3b9e91e5de2dc242f7bb017139306ec10d3d"),
        asset("background-template", "PURPLE_TAUPE", "banner/purple_taupe.png", 456, "1a4e0a816b025ac8933fb9793e64c1b35628ced2917b2d8fc61b3352ec8e0dcc"),
        asset("background-template", "VELVET", "banner/velvet.png", 330, "100ad47901f3a74de478d56f5cad1fb418a2d8569d2ec5a9808b281cdcba2d5c"),
        asset("background-template", "YELLOW", "banner/yellow.png", 3_525, "f8e7957eb1f7ef41cb5bc3caca03d7d58a2b6b7cc2875d35d4845ddb4a892761"),
        asset("font", "InterBold", "fonts/InterBold.ttf", 316_100, "2ad83f2446566c5ecf7c261cc07884a5d5f71965b5df8fd7bb809f83a42bf470"),
        asset("font", "InterRegular", "fonts/InterRegular.ttf", 314_712, "a0b1f949528f7a3a2d2ff3b6df67c6c1b5cb8f62a2eba6eb5e06adff2d5795f3"),
        asset("font", "JetbrainsMonoBold", "fonts/JetbrainsMonoBold.ttf", 210_128, "3cc3cc375448f2570930c5adb6d07f9defa9ceb7d47cb710b859d06a22d4eee6"),
        asset("font", "JetbrainsMonoRegular", "fonts/JetbrainsMonoRegular.ttf", 203_952, "50e1dcb40298fcfcc21a1ef3cbee9fe9e82709c48ad30ce617472c06a3bd9436"),
        asset("font", "MontserratBold", "fonts/MontserratBold.ttf", 261_588, "c4c8cb572a5a2c43d78b3701f4b2349684e6ca4d1557e469af6065b1e099c26c"),
        asset("font", "MontserratRegular", "fonts/MontserratRegular.ttf", 263_192, "81ebc3916b524007b756d91d9df13c7673ec401161f2cad161662d08dcf1cc72"),
        asset("font", "OpenSansBold", "fonts/OpenSansBold.ttf", 224_452, "1b43de2449d39b65ff6f63315d4afda585f72fbbec2e3d9a56f59de6c75149d3"),
        asset("font", "OpenSansRegular", "fonts/OpenSansRegular.ttf", 217_276, "13c03e22a633919beb2847c58c8285fb8a735ee97097d7c48fd403f8294b05f8"),
        asset("font", "PoppinsBold", "fonts/PoppinsBold.ttf", 155_972, "19df3a425dd6f1ffaa1765b4f76ad5ad4701d73e24c5abfa0c0e50ba139e670d"),
        asset("font", "PoppinsRegular", "fonts/PoppinsRegular.ttf", 160_292, "6eb324da275c57ad131f532ed97148c45b7a8fc7efddfbeae608c4e4b24b364e"),
        asset("font", "RalewayBold", "fonts/RalewayBold.ttf", 179_244, "ca9de8b3be7ccd4b80774a9c7dd56a98c49c276771c5957729b5958d1d579112"),
        asset("font", "RalewayRegular", "fonts/RalewayRegular.ttf", 178_520, "20e4ae409ffbe8bfd2af14d7f717398408ae8b481005beccb83d62ef4052b681"),
        asset("font", "RobotoBold", "fonts/RobotoBold.ttf", 167_336, "baf44ce81636cc927fc27768437e5da853bac699e8aaf832d042f0dfed29b4b4"),
        asset("font", "RobotoRegular", "fonts/RobotoRegular.ttf", 168_260, "319cff6e7a31f0f2a41c475dca42890aa5d19fe16017e2290f8c1d4e14f76481"),
        asset("font", "SourceSansProBold", "fonts/SourceSansProBold.ttf", 290_916, "da4f442e66843990825ed4757e27ad3442cad83f9844cc503e8ece85e00f77f2"),
        asset("font", "SourceSansProRegular", "fonts/SourceSansProRegular.ttf", 293_516, "71d10a86b4c54a5a9c0c8b467e53ac67d79edb96c956e4e9f65a7074dfb9992a"),
        asset("sprite", "DEFAULT_AUTHOR_LOGO", "sprites/default_author_logo.png", 1_095, "9bc4025bd803794aa9d4af3177dbddc4c9182f379f8db2146674b44cf2a86a7e"),
        asset("sprite", "DEFAULT_BUILTBYBIT_RES_LOGO", "sprites/default_builtbybit_res_logo.png", 122_943, "1bdcc50d96456059b57713272b5cc74258384198b9fd8484111d4b246f747738", "fallback logo"),
        asset("sprite", "DEFAULT_CURSEFORGE_RES_LOGO", "sprites/default_curseforge_res_logo.png", 3_693, "ad3d41c7e831d3c79fe3392247f61e055044ac53e47c13a475ae4b8784a85bd8", "fallback logo"),
        asset("sprite", "DEFAULT_HANGAR_RES_LOGO", "sprites/default_hangar_res_logo.png", 45_164, "520da4c1434e2b7609e6cc1f03f295bd67741040329500b1e7a79b56c8e5b4f0", "fallback logo"),
        asset("sprite", "DEFAULT_MODRINTH_RES_LOGO", "sprites/default_modrinth_res_logo.png", 13_885, "5214633eaeed1a4a551f0a8ec6ad1f379f52d0e7dac3c52728daf66d5941e001", "fallback logo"),
        asset("sprite", "DEFAULT_POLYMART_RES_LOGO", "sprites/default_polymart_res_logo.png", 179_636, "75606aafd2ce942f24cb32c70f186999b15114d6f9fcffe0e8ab5d10df709a06", "fallback logo"),
        asset("sprite", "DEFAULT_SERVER_LOGO", "sprites/default_server_logo.png", 219, "b3cb0bbb63c90c6b47599681052b8c0fb95c85f227e9542fddca985604e3fa50"),
        asset("sprite", "DEFAULT_SPIGOT_RES_LOGO", "sprites/default_spigot_res_logo.png", 9_260, "4318af48dbfe0b8d5fdf90d91c805a5070ddf9456f8bb7717f30f43af41b0604", "fallback logo"),
        asset("sprite", "DEFAULT_SPONGE_RES_LOGO", "sprites/default_sponge_res_logo.png", 1_220, "394b9c0977fd16eb6eec9b803f733d92ea20391e11952b14ed312ab944bf0694", "fallback logo"),
        asset("sprite", "STAR_FULL", "sprites/star_full.png", 262, "cdd1cd9c5819b5a0f5c8b92e6612d81fd3d239c17edcc0b5a339ef7452f6736b", "rating star"),
        asset("sprite", "STAR_HALF", "sprites/star_half.png", 314, "23aef2c63b0345857b1f6e4a8d645905f8a11e7a6a2c0c49480b7e1a3a268974", "rating star"),
        asset("sprite", "STAR_NONE", "sprites/star_none.png", 253, "f7bf6607c9242f935310878d7350e9589a82591b3b905aea5e045b07cfa7c7e6", "rating star")
    ]
};
export class AssetValidationError extends Error {
    issues;
    constructor(issues) {
        super(`Asset validation failed: ${issues.join("; ")}`);
        this.issues = issues;
        this.name = "AssetValidationError";
    }
}
export const resolveAssetPath = (assetReference) => {
    const resolved = resolve(assetRoot, assetReference.relativePath);
    const assetRootWithSeparator = `${assetRoot}${sep}`;
    if (resolved !== assetRoot && !resolved.startsWith(assetRootWithSeparator)) {
        throw new AssetValidationError([
            `Asset path escapes asset root: ${assetReference.relativePath}`
        ]);
    }
    return resolved;
};
export const computeAssetSha256 = async (filePath) => await new Promise((resolveHash, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => {
        hash.update(chunk);
    });
    stream.on("end", () => {
        resolveHash(hash.digest("hex"));
    });
});
export const validateAssetManifest = (manifest = rendererAssetManifest) => {
    const issues = [];
    const keys = new Set();
    for (const assetReference of manifest.assets) {
        if (keys.has(assetReference.key)) {
            issues.push(`Duplicate asset key: ${assetReference.key}`);
        }
        keys.add(assetReference.key);
        if (!assetKindValues.includes(assetReference.kind)) {
            issues.push(`Unsupported asset kind for ${assetReference.key}: ${assetReference.kind}`);
        }
        const actualExtension = extname(assetReference.relativePath);
        if (!supportedAssetExtensions.includes(assetReference.extension) ||
            assetReference.extension !== actualExtension) {
            issues.push(`Unsupported or mismatched extension for ${assetReference.key}: ${assetReference.extension}`);
        }
        if (!/^[a-f0-9]{64}$/.test(assetReference.sha256)) {
            issues.push(`Invalid SHA-256 for ${assetReference.key}`);
        }
    }
    if (issues.length > 0) {
        throw new AssetValidationError(issues);
    }
    return manifest;
};
export const validateAssetFiles = async (manifest = rendererAssetManifest) => {
    validateAssetManifest(manifest);
    const issues = [];
    for (const assetReference of manifest.assets) {
        if (!assetReference.required) {
            continue;
        }
        const resolvedPath = resolveAssetPath(assetReference);
        try {
            await access(resolvedPath);
            const fileStat = await stat(resolvedPath);
            if (!fileStat.isFile()) {
                issues.push(`Required asset is not a file: ${assetReference.key}`);
                continue;
            }
            if (fileStat.size !== assetReference.byteSize) {
                issues.push(`Size mismatch for ${assetReference.key}: expected ${String(assetReference.byteSize)}, got ${String(fileStat.size)}`);
            }
            const actualHash = await computeAssetSha256(resolvedPath);
            if (actualHash !== assetReference.sha256) {
                issues.push(`SHA-256 mismatch for ${assetReference.key}`);
            }
        }
        catch (error) {
            issues.push(`Required asset missing or unreadable: ${assetReference.key} (${String(error)})`);
        }
    }
    if (issues.length > 0) {
        throw new AssetValidationError(issues);
    }
    return manifest;
};
