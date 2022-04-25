// import { type } from "os"
import { toHandlers } from "vue"
// import * as CIE from "./CMF"
import {
    CIE1931CMF_FinishNM,
    CIE1931CMF_StartNM,
    CIE1931CMF_X,
    CIE1931CMF_Y,
    CIE1931CMF_Z,
} from "./CMF"

function clamp(input: number, low: number, high: number): number {
    return Math.min(high, Math.max(low, input))
}

abstract class ThreeDimColourFormat {
    d1: number
    d2: number
    d3: number
    hasClamped = false

    constructor(_a: number = 0, _b: number = 0, _c: number = 0) {
        this.d1 = _a
        this.d2 = _b
        this.d3 = _c
    }

    protected abstract create(d1: number, d2: number, d3: number): this

    getScaled(scaleFactor: number) {
        return this.create(
            this.d1 * scaleFactor,
            this.d2 * scaleFactor,
            this.d3 * scaleFactor
        )
    }

    getClamped() {
        const d1 = clamp(this.d1, 0, 1)
        const d2 = clamp(this.d2, 0, 1)
        const d3 = clamp(this.d3, 0, 1)
        return this.create(d1, d2, d3)
    }

    asArray() {
        return [this.d1, this.d2, this.d3]
    }

    // get3 = this.asArray
    get3() {
        return this.asArray()
    }

    get2(): [number, number] {
        return [this.d1, this.d2]
    }

    [Symbol.iterator]() {
        let counter = 0
        return {
            next: () => {
                switch (counter) {
                    case 0: {
                        var value = this.d1
                        break
                    }
                    case 1: {
                        var value = this.d2
                        break
                    }
                    default: {
                        var value = this.d3
                    }
                }
                counter++
                return {
                    done: counter >= 4,
                    value: value,
                }
            },
        }
    }
}

class xyY extends ThreeDimColourFormat {
    get x() {
        return this.d1
    }
    get y() {
        return this.d2
    }
    get Y() {
        return this.d3
    }
    create(d1: number, d2: number, d3: number) {
        return new xyY(d1, d2, d3) as this
    }
}
class RGB extends ThreeDimColourFormat {
    get R() {
        return this.d1
    }
    get G() {
        return this.d2
    }
    get B() {
        return this.d3
    }
    create(d1: number, d2: number, d3: number) {
        return new RGB(d1, d2, d3) as this
    }
}

class Yuv extends ThreeDimColourFormat {
    get Y() {
        return this.d1
    }
    get u() {
        return this.d2
    }
    get v() {
        return this.d3
    }
    create(d1: number, d2: number, d3: number) {
        return new Yuv(d1, d2, d3) as this
    }
}

function dotProduct(vector: number[], matrix: number[][]): number[] {
    const out = <number[]>[]
    for (let i = 0; i < vector.length; i++) {
        var sum = 0
        for (let j = 0; j < vector.length; j++) {
            sum += matrix[i][j] * vector[j]
        }
        out.push(sum)
    }
    return out
}

class ColourXYZ extends ThreeDimColourFormat {
    protected create(d1: number, d2: number, d3: number): this {
        return new ColourXYZ(d1, d2, d3) as this
    }

    get_sRGB({
        clampOutput = true,
        preNormalise = false,
        normaliseTarget = 1,
    } = {}): RGB {
        const sRGBMatrix = [
            [3.2404542, -1.5371385, -0.4985314],
            [-0.969266, 1.8760108, 0.041556],
            [0.0556434, -0.2040259, 1.0572252],
        ]
        const aa = 12.92
        const bb = 1.055
        const cc = 0.055
        const ee = 0.0031308

        let hasClamped = false

        const transformed = dotProduct(this.asArray(), sRGBMatrix)
        let mult = 1
        if (preNormalise) {
            const maxVal = Math.max(...transformed)
            mult = (1 / maxVal) * normaliseTarget
        }
        const [R, G, B] = transformed.map((a_unmult: number) => {
            const a = a_unmult * mult
            let clamped = a
            if (clampOutput) {
                let clamped = clamp(a, 0, 1)
                if (clamped != a) {
                    hasClamped = true
                }
            }
            if (clamped < ee) {
                return clamped * aa
            } else {
                return Math.pow(clamped, 1.0 / 2.4) * bb - cc
            }
        })

        const rgb = new RGB(R, G, B)
        rgb.hasClamped = hasClamped
        return rgb
    }

    // setxyY(x: number, y: number, Y: number): void {
    // this.d1 = (x * Y) / y
    // this.d2 = Y
    // this.d3 = ((1 - x - y) * Y) / y
    // }

    getxyY(): xyY {
        const sum = this.d1 + this.d2 + this.d3
        const x = this.d1 / sum
        const y = this.d2 / sum
        const Y = this.d2
        return new xyY(x, y, Y)
    }

    setsRGB(R: number, G: number, B: number) {
        const aa = 12.92
        const bb = 1.055
        const cc = 0.055
        const ee = 0.04045
        const matrix = [
            [0.4124564, 0.3575761, 0.1804375],
            [0.2126729, 0.7151522, 0.072175],
            [0.0193339, 0.119192, 0.9503041],
        ]

        const RGB = [R, G, B]
        const RGBScaled = RGB.map((n: number) => {
            let linearised = 0
            if (n > ee) {
                linearised = Math.pow((n + cc) / bb, 2.4)
            } else {
                linearised = n / aa
            }
            return linearised
        })
        const XYZ = dotProduct(RGBScaled, matrix)
        // debugger
        this.d1 = XYZ[0]
        this.d2 = XYZ[1]
        this.d3 = XYZ[2]
    }

    // setYuv(Y: number, u: number, v: number): void {
    //     const x = (3 * u) / (2 * u - 8 * v + 4)
    //     const y = (2 * v) / (2 * u - 8 * v + 4)
    //     this.setxyY(x, y, Y)
    // }

    // setDaylightCCT(cct: number, Y = 1): void {
    //     if (cct < 4000) {
    //         throw new RangeError("Daylight CCT must be > 4000K")
    //     } else if (4000 <= cct && cct <= 7000) {
    //         var term1 = -4.607e9 / Math.pow(cct, 3)
    //         var term2 = 2.9678e6 / Math.pow(cct, 2)
    //         var term3 = 0.09911e3 / cct
    //         var term4 = 0.244063
    //         var x = term1 + term2 + term3 + term4
    //     } else if (7000 < cct && cct <= 25000) {
    //         var term1 = -2.0064e9 / Math.pow(cct, 3)
    //         var term2 = 1.9018e6 / Math.pow(cct, 2)
    //         var term3 = 0.24748e3 / cct
    //         var term4 = 0.23704
    //         var x = term1 + term2 + term3 + term4
    //     } else {
    //         throw new RangeError("Daylight CCT must be <= 25000K")
    //     }

    //     const y = -3 * Math.pow(x, 2) + 2.87 * x - 0.275
    //     this.setxyY(x, y, Y)
    // }

    // setBlackbodyCCT(cct: number, Y = 1) {
    //     const cct2 = Math.pow(cct, 2)
    //     const u =
    //         (0.860117757 + 1.54118254e-4 * cct + 1.28641212e-7 * cct2) /
    //         (1 + 8.42420235e-4 * cct + 7.08145163e-7 * cct2)
    //     const v =
    //         (0.317398726 + 4.22806245e-5 * cct + 4.20481691e-8 * cct2) /
    //         (1 - 2.89741816e-5 * cct + 1.61456053e-7 * cct2)
    //     this.setYuv(Y, u, v)
    // }

    get X() {
        return this.d1
    }
    get Y() {
        return this.d2
    }
    get Z() {
        return this.d3
    }

    blend(other: ColourXYZ, prop: number = 0.5) {
        const neg = 1 - prop
        this.d1 = prop * other.d1 + neg * this.d1
        this.d2 = prop * other.d2 + neg * this.d2
        this.d3 = prop * other.d3 + neg * this.d3
    }
}

function newFromxyY(inxyY: xyY): ColourXYZ {
    const { x, y, Y } = inxyY
    const X = (x * Y) / y
    const Z = ((1 - x - y) * Y) / y
    return new ColourXYZ(X, Y, Z)
}

function newFromYuv(input: Yuv): ColourXYZ {
    const { Y, u, v } = input
    const x = (3 * u) / (2 * u - 8 * v + 4)
    const y = (2 * v) / (2 * u - 8 * v + 4)
    return newFromxyY(new xyY(x, y, Y))
}
function newFrom_sRGB(input: RGB): ColourXYZ {
    const aa = 12.92
    const bb = 1.055
    const cc = 0.055
    const ee = 0.04045
    const matrix = [
        [0.4124564, 0.3575761, 0.1804375],
        [0.2126729, 0.7151522, 0.072175],
        [0.0193339, 0.119192, 0.9503041],
    ]

    const RGB = input.asArray()
    const RGBScaled = RGB.map((n: number) => {
        let linearised = 0
        if (n > ee) {
            linearised = Math.pow((n + cc) / bb, 2.4)
        } else {
            linearised = n / aa
        }
        return linearised
    })
    const xyz = dotProduct(RGBScaled, matrix)
    return new ColourXYZ(...xyz)
}

function newFromBlackbodyCCT(cct: number, Y = 1) {
    const cct2 = Math.pow(cct, 2)
    const u =
        (0.860117757 + 1.54118254e-4 * cct + 1.28641212e-7 * cct2) /
        (1 + 8.42420235e-4 * cct + 7.08145163e-7 * cct2)
    const v =
        (0.317398726 + 4.22806245e-5 * cct + 4.20481691e-8 * cct2) /
        (1 - 2.89741816e-5 * cct + 1.61456053e-7 * cct2)
    return newFromYuv(new Yuv(Y, u, v))
}

function newFromDaylightCCT(cct: number, Y = 1) {
    if (cct < 4000) {
        throw new RangeError("Daylight CCT must be > 4000K")
    } else if (4000 <= cct && cct <= 7000) {
        var term1 = -4.607e9 / Math.pow(cct, 3)
        var term2 = 2.9678e6 / Math.pow(cct, 2)
        var term3 = 0.09911e3 / cct
        var term4 = 0.244063
        var x = term1 + term2 + term3 + term4
    } else if (7000 < cct && cct <= 25000) {
        var term1 = -2.0064e9 / Math.pow(cct, 3)
        var term2 = 1.9018e6 / Math.pow(cct, 2)
        var term3 = 0.24748e3 / cct
        var term4 = 0.23704
        var x = term1 + term2 + term3 + term4
    } else {
        throw new RangeError("Daylight CCT must be <= 25000K")
    }

    const y = -3 * Math.pow(x, 2) + 2.87 * x - 0.275
    return newFromxyY(new xyY(x, y, Y))
}

// class sRGB extends ThreeDimColourFormat {
//     r = this.d1
//     g = this.d2
//     b = this.d3
// }

// function xyYtosRGB(input: xyY): sRGB {
//     return new sRGB(0, 0, 0)
// }

const D65 = new ColourXYZ(95.047 / 100, 1, 108.883 / 100)
const D50 = new ColourXYZ(0.9642, 1, 0.8249)

function getSpectral(nm: number): ColourXYZ {
    const intnm = Math.round(nm)
    return new ColourXYZ(
        CIE1931CMF_X[intnm - CIE1931CMF_StartNM],
        CIE1931CMF_Y[intnm - CIE1931CMF_StartNM],
        CIE1931CMF_Z[intnm - CIE1931CMF_StartNM]
    )
}

export {
    ColourXYZ,
    D65,
    D50,
    getSpectral,
    xyY,
    clamp,
    newFromxyY,
    RGB,
    newFrom_sRGB,
    newFromBlackbodyCCT,
    newFromDaylightCCT,
}
// export type { RGB }
