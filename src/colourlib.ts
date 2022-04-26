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

    getxyY(): xyY {
        const sum = this.d1 + this.d2 + this.d3
        const x = this.d1 / sum
        const y = this.d2 / sum
        const Y = this.d2
        return new xyY(x, y, Y)
    }

    get X() {
        return this.d1
    }
    get Y() {
        return this.d2
    }
    get Z() {
        return this.d3
    }
}

function newFrom_xyY(inxyY: xyY): ColourXYZ {
    const { x, y, Y } = inxyY
    const X = (x * Y) / y
    const Z = ((1 - x - y) * Y) / y
    return new ColourXYZ(X, Y, Z)
}

function newFrom_Yuv(input: Yuv): ColourXYZ {
    const { Y, u, v } = input
    const x = (3 * u) / (2 * u - 8 * v + 4)
    const y = (2 * v) / (2 * u - 8 * v + 4)
    return newFrom_xyY(new xyY(x, y, Y))
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

type CCTFactory = {
    (cctK: number, Y?: number): ColourXYZ
} & {
    minK: number
    maxK: number
}
const newBlackbody = <CCTFactory>Object.assign(
    function newFromBlackbodyCCT(cctK: number, Y = 1) {
        const cct2 = Math.pow(cctK, 2)
        const u =
            (0.860117757 + 1.54118254e-4 * cctK + 1.28641212e-7 * cct2) /
            (1 + 8.42420235e-4 * cctK + 7.08145163e-7 * cct2)
        const v =
            (0.317398726 + 4.22806245e-5 * cctK + 4.20481691e-8 * cct2) /
            (1 - 2.89741816e-5 * cctK + 1.61456053e-7 * cct2)
        return newFrom_Yuv(new Yuv(Y, u, v))
    },
    { minK: 1000, maxK: 25000 }
)

const newDaylight = <CCTFactory>Object.assign(
    function (cctK: number, Y = 1) {
        let x: number
        if (cctK < 4000) {
            throw new RangeError("Daylight CCT must be >= 4000K")
        } else if (4000 <= cctK && cctK <= 7000) {
            x =
                -4.607e9 / Math.pow(cctK, 3) +
                2.9678e6 / Math.pow(cctK, 2) +
                0.09911e3 / cctK +
                0.244063
        } else if (7000 < cctK && cctK <= 25000) {
            x =
                -2.0064e9 / Math.pow(cctK, 3) +
                1.9018e6 / Math.pow(cctK, 2) +
                0.24748e3 / cctK +
                0.23704
        } else {
            throw new RangeError("Daylight CCT must be <= 25000K")
        }

        const y = -3 * Math.pow(x, 2) + 2.87 * x - 0.275
        return newFrom_xyY(new xyY(x, y, Y))
    },
    { minK: 4000, maxK: 25000 }
)

const D65 = new ColourXYZ(95.047 / 100, 1, 108.883 / 100)
const D50 = new ColourXYZ(0.9642, 1, 0.8249)

type SpectralFactory = {
    (nm: number): ColourXYZ
} & {
    min: number
    max: number
}
const newSpectralNM = <SpectralFactory>Object.assign(
    function (nm: number): ColourXYZ {
        const intnm = Math.round(nm)
        return new ColourXYZ(
            CIE1931CMF_X[intnm - CIE1931CMF_StartNM],
            CIE1931CMF_Y[intnm - CIE1931CMF_StartNM],
            CIE1931CMF_Z[intnm - CIE1931CMF_StartNM]
        )
    },
    { min: CIE1931CMF_StartNM, max: CIE1931CMF_FinishNM }
)

export {
    ColourXYZ,
    D65,
    D50,
    newSpectralNM,
    xyY,
    clamp,
    newFrom_xyY,
    RGB,
    newFrom_sRGB,
    newBlackbody,
    newDaylight,
}
// export type { RGB }
