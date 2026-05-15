/** Banner canvas pixel width — matches legacy ImageBuilder dimensions. */
export const SERVER_BANNER_WIDTH = 300;
/** Banner canvas pixel height — matches legacy ImageBuilder dimensions. */
export const SERVER_BANNER_HEIGHT = 100;
/**
 * Right-edge pixel boundary used for MOTD wrap width.
 * Ported from WrappableTextComponent: wrap(fontSize, 295 - this.x)
 * Default wrap width at x=104: 295 - 104 = 191 pixels.
 */
export const SERVER_BANNER_WRAP_RIGHT_EDGE = 295;
/**
 * Maximum logo pixel size.
 * Ported from LogoComponent constructor: maxLogoSize default = 96.
 */
export const SERVER_BANNER_LOGO_MAX_SIZE = 96;
/**
 * Default server banner settings.
 * Directly ported from ServerParameters.java constructor defaults and
 * GlobalParameters.java for background/logo.
 *
 * Do not change these values without verifying against the legacy Java source.
 */
export const DEFAULT_SERVER_BANNER_SETTINGS = {
    background: { template: "MOONLIGHT_PURPLE" },
    logo: { x: 12, size: 80 },
    serverName: {
        x: 104,
        y: 22,
        fontSize: 18,
        fontBold: true,
        fontFace: "SOURCE_SANS_PRO",
        textAlign: "LEFT",
        display: "",
        enable: true,
        maxChars: 9999
    },
    version: {
        x: 104,
        y: 38,
        fontSize: 14,
        fontBold: false,
        fontFace: "SOURCE_SANS_PRO",
        textAlign: "LEFT",
        display: "",
        enable: true,
        maxChars: 9999
    },
    motd: {
        x: 104,
        y: 55,
        fontSize: 14,
        fontBold: false,
        fontFace: "SOURCE_SANS_PRO",
        textAlign: "LEFT",
        display: "",
        enable: true,
        maxChars: 9999
    },
    players: {
        x: 104,
        y: 85,
        fontSize: 14,
        fontBold: false,
        fontFace: "SOURCE_SANS_PRO",
        textAlign: "LEFT",
        display: "",
        enable: true,
        maxChars: 9999
    }
};
