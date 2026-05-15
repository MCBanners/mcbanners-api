/** Banner canvas pixel width — matches legacy ImageBuilder dimensions. */
export declare const SERVER_BANNER_WIDTH = 300;
/** Banner canvas pixel height — matches legacy ImageBuilder dimensions. */
export declare const SERVER_BANNER_HEIGHT = 100;
/**
 * Right-edge pixel boundary used for MOTD wrap width.
 * Ported from WrappableTextComponent: wrap(fontSize, 295 - this.x)
 * Default wrap width at x=104: 295 - 104 = 191 pixels.
 */
export declare const SERVER_BANNER_WRAP_RIGHT_EDGE = 295;
/**
 * Maximum logo pixel size.
 * Ported from LogoComponent constructor: maxLogoSize default = 96.
 */
export declare const SERVER_BANNER_LOGO_MAX_SIZE = 96;
/**
 * Default server banner settings.
 * Directly ported from ServerParameters.java constructor defaults and
 * GlobalParameters.java for background/logo.
 *
 * Do not change these values without verifying against the legacy Java source.
 */
export declare const DEFAULT_SERVER_BANNER_SETTINGS: {
  readonly background: {
    readonly template: "MOONLIGHT_PURPLE";
  };
  readonly logo: {
    readonly x: 12;
    readonly size: 80;
  };
  readonly serverName: {
    readonly x: 104;
    readonly y: 22;
    readonly fontSize: 18;
    readonly fontBold: true;
    readonly fontFace: "SOURCE_SANS_PRO";
    readonly textAlign: "LEFT";
    readonly display: "";
    readonly enable: true;
    readonly maxChars: 9999;
  };
  readonly version: {
    readonly x: 104;
    readonly y: 38;
    readonly fontSize: 14;
    readonly fontBold: false;
    readonly fontFace: "SOURCE_SANS_PRO";
    readonly textAlign: "LEFT";
    readonly display: "";
    readonly enable: true;
    readonly maxChars: 9999;
  };
  readonly motd: {
    readonly x: 104;
    readonly y: 55;
    readonly fontSize: 14;
    readonly fontBold: false;
    readonly fontFace: "SOURCE_SANS_PRO";
    readonly textAlign: "LEFT";
    readonly display: "";
    readonly enable: true;
    readonly maxChars: 9999;
  };
  readonly players: {
    readonly x: 104;
    readonly y: 85;
    readonly fontSize: 14;
    readonly fontBold: false;
    readonly fontFace: "SOURCE_SANS_PRO";
    readonly textAlign: "LEFT";
    readonly display: "";
    readonly enable: true;
    readonly maxChars: 9999;
  };
};
//# sourceMappingURL=server-banner-defaults.d.ts.map
