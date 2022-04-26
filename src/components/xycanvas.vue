<script setup lang="ts">
import { onMounted, ref, watch } from "vue"
import {
    ColourXYZ,
    D65,
    D50,
    newSpectralNM,
    clamp,
    newFrom_xyY,
    newFrom_sRGB,
    newDaylight,
    newBlackbody,
    RGB,
    xyY,
} from "../colourlib"

type SpectrumPoint = {
    nm: number
    x: number
    y: number
}
type AxisLabel = {
    text: string
    x: number
    y: number
}
type ColourLabel = {
    text: string
    x: number
    y: number
}

function* range(start: number, end: number, step = 1) {
    for (let i = start; i < end; i += step) {
        yield i
    }
}
function* range2d(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    stepX = 1,
    stepY = 1
) {
    for (let x = startX; x < endX; x += stepX) {
        for (let y = startY; y < endY; y += stepY) {
            yield { x, y }
        }
    }
}

const spectrumPoints = ref(<SpectrumPoint[]>[])
const axisLabels = ref(<AxisLabel[]>[])
const colourLabels = ref(<ColourLabel[]>[])
const gamutShadePoints = ref("")
const gamutStrokePoints = ref("")
const spectrumShadePoints = ref("")
const spectrumStrokePoints = ref("")
const spectrumMarkPoints = ref("")
const blackbodyPoints = ref("")
const daylightPoints = ref("")

interface Tick {
    num: number
    key: number
}
const xTicks = ref(<Tick[]>[])
const yTicks = ref(<Tick[]>[])
const xTicksMinor = ref(<Tick[]>[])
const yTicksMinor = ref(<Tick[]>[])

const xStartCoord = ref(0)
const xEndCoord = ref(0)
const yStartCoord = ref(0)
const yEndCoord = ref(0)

const gradStartx = ref(0)
const gradEndx = ref(0.8)
const gradStarty = ref(0)
const gradEndy = ref(0.9)

const squareSize = ref("")

const scroll = ref(50)
const scrolly = ref(50)
const zoom = ref(20)

const sF = 20

type axisTicks = {
    figures: number
    step: number
    subDivs: number
}

function getAxisTicks(axisIsY = false): axisTicks {
    let span: number
    if (axisIsY) {
        span = gradEndy.value - gradStarty.value
    } else {
        span = gradEndx.value - gradStartx.value
    }
    let stepOptions = [0.2, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.0001]
    let subDivsOptions = [4, 5, 5, 4, 5, 5, 4, 5]
    let stepIndx = 0
    let step = 0.2
    let subDivs = 4

    while (span / stepOptions[stepIndx] < 6 && stepIndx <= 7) {
        stepIndx++
    }
    step = stepOptions[stepIndx]
    subDivs = subDivsOptions[stepIndx]
    return {
        figures: step < 0.1 ? 2 : 1,
        step: step,
        subDivs: subDivs,
    }
}

function drawStuff() {
    const canvas = document.getElementById("myCanvas") as HTMLCanvasElement
    const canvashide = document.getElementById("canvasoverflowhide")
    const ctx = canvas.getContext("2d")
    if (ctx == null || canvashide == null) {
        throw TypeError("No canvas context or canvashide element")
    }

    const gradStartX = 100
    const gradStartY = 0
    const gradWidth = canvashide?.offsetWidth
    const gradHeight = canvashide?.offsetHeight

    const xStep = 20
    const yStep = 20

    squareSize.value = `x: ${xStep}, y:${yStep}`

    xStartCoord.value = gradStartX
    xStartCoord.value = 0
    xEndCoord.value = gradStartX + gradWidth
    yStartCoord.value = gradStartY
    yEndCoord.value = gradStartY + gradHeight

    function xyToCanvasxy(x: number, y: number) {
        const xnorm =
            (x - gradStartx.value) / (gradEndx.value - gradStartx.value)
        const ynorm =
            1.0 - (y - gradStarty.value) / (gradEndy.value - gradStarty.value)
        var xcoord = xnorm * gradWidth
        var ycoord = ynorm * gradHeight
        return [xcoord, ycoord]
    }

    for (let { x: xcoord, y: ycoord } of range2d(
        0,
        0,
        gradWidth,
        gradHeight,
        xStep,
        yStep
    )) {
        const xNorm = xcoord / gradWidth
        const yNorm = 1.0 - ycoord / gradHeight
        const xScaled =
            xNorm * (gradEndx.value - gradStartx.value) + gradStartx.value
        const yScaled =
            yNorm * (gradEndy.value - gradStarty.value) + gradStarty.value
        const colour_xyY = new xyY(xScaled, yScaled, 0.5).getClamped()
        const colourRGB = newFrom_xyY(colour_xyY)
            .get_sRGB({
                clampOutput: true,
                preNormalise: true,
            })
            .getScaled(255)
        // const yClipped = Math.min(yStep, gradHeight - y - gradStartY)
        ctx.fillStyle = `rgb(${colourRGB.R}, ${colourRGB.G}, ${colourRGB.B})`
        ctx.fillRect(xcoord / sF, ycoord / sF, xStep / sF, yStep / sF)
    }

    //
    //  Shade gamut triangle
    //
    const bluePrimary = newFrom_sRGB(new RGB(0, 0, 1))
    const greenPrimary = newFrom_sRGB(new RGB(0, 1, 0))
    const redPrimary = newFrom_sRGB(new RGB(1, 0, 0))
    const polypoints: Array<[number, number]> = [
        [-0.5, -0.5],
        [-0.5, 1.5],
        [1.5, 1.5],
        [1.5, -0.5],
        [-0.5, -0.5],
        bluePrimary.getxyY().get2(),
        redPrimary.getxyY().get2(),
        greenPrimary.getxyY().get2(),
        bluePrimary.getxyY().get2(),
        [-0.5, -0.5],
    ]
    const strokepoints: Array<[number, number]> = [
        redPrimary.getxyY().get2(),
        greenPrimary.getxyY().get2(),
        bluePrimary.getxyY().get2(),
    ]

    let shadeStr: string = ""
    for (let point of polypoints) {
        var [xcoord, ycoord] = xyToCanvasxy(...point)
        shadeStr += `${xcoord},${ycoord} `
    }

    gamutShadePoints.value = shadeStr

    //
    // Stroke gamut triangle
    //
    let strokeStr = ""
    for (let point of strokepoints) {
        var [xcoord, ycoord] = xyToCanvasxy(...point)
        strokeStr += `${xcoord},${ycoord} `
    }
    gamutStrokePoints.value = strokeStr

    //
    // Get spectral locus points
    //
    type spectrumDatum = {
        nm: number
        xcoord: number
        ycoord: number
    }
    const spectrumData: spectrumDatum[] = []
    for (let nm of range(newSpectralNM.min, newSpectralNM.max, 2)) {
        const { x, y, Y } = newSpectralNM(nm).getxyY()
        const [xcoord, ycoord] = xyToCanvasxy(x, y)
        spectrumData.push({ nm, xcoord, ycoord })
    }

    //
    // Shade area outside spectral locus
    //
    const locusShadeArray = <number[][]>[]
    locusShadeArray.push(xyToCanvasxy(-1, -1))
    for (const datum of spectrumData) {
        locusShadeArray.push([datum.xcoord, datum.ycoord])
    }
    locusShadeArray.push([spectrumData[0].xcoord, spectrumData[0].ycoord])
    locusShadeArray.push(xyToCanvasxy(-1, -1))
    locusShadeArray.push(xyToCanvasxy(1.5, 0))
    locusShadeArray.push(xyToCanvasxy(1.5, 1.5))
    locusShadeArray.push(xyToCanvasxy(-1, 1.5))
    let locusstr = ""
    for (let [x, y] of locusShadeArray) {
        locusstr += `${x.toFixed(1)},${y.toFixed(1)} `
    }
    spectrumShadePoints.value = locusstr

    //
    // Plot spectral locus
    //
    spectrumStrokePoints.value = spectrumData.reduce((a, d) => {
        return a + `${d.xcoord.toFixed(1)}, ${d.ycoord.toFixed(1)} `
    }, "")

    //
    // Label spectum points
    //
    spectrumPoints.value = spectrumData
        .filter((d) => {
            return (
                (d.nm % 10 == 0 && d.nm >= 470 && d.nm <= 620) ||
                [700, 640, 450].includes(d.nm)
            )
        })
        .map((d) => ({
            nm: d.nm,
            x: d.xcoord,
            y: d.ycoord,
        }))

    //
    // Plot blackbody and daylight loci
    //
    const out = [false, true].map((isDaylight): string => {
        let str = ""
        const factory = isDaylight ? newDaylight : newBlackbody
        for (let k = factory.minK; k <= factory.maxK; k += 100) {
            const colour: ColourXYZ = factory(k)
            const [xcoord, ycoord] = xyToCanvasxy(...colour.getxyY().get2())
            str += `${xcoord.toFixed(1)},${ycoord.toFixed(1)} `
        }
        return str
    })
    ;[daylightPoints.value, blackbodyPoints.value] = out

    //
    // Plot Whitepoints
    //
    // const labelArray = []
    type Whitepoint = {
        colour: ColourXYZ
        label: string
    }
    const whitepoints: Whitepoint[] = [
        { colour: D65, label: "D65" },
        { colour: D50, label: "D50" },
        { colour: newBlackbody(2856), label: "A" },
    ]
    colourLabels.value = whitepoints.map(
        (whitepoint: Whitepoint): ColourLabel => {
            const [x, y] = xyToCanvasxy(...whitepoint.colour.getxyY().get2())
            return { text: whitepoint.label, x, y }
        }
    )

    //
    // Gridlines
    //
    const axisLabelsAry = <AxisLabel[]>[]
    const xTicksAry = <Tick[]>[]
    const xTicksMinorAry = <Tick[]>[]
    const yTicksAry = <Tick[]>[]
    const yTicksMinorAry = <Tick[]>[]
    function addGridLines() {
        let aO = getAxisTicks(false)
        let i = 0
        for (
            let xtick = Math.floor(gradStartx.value * 10) / 10;
            xtick < gradEndx.value;
            xtick += aO.step / aO.subDivs
        ) {
            if (i % aO.subDivs == 0) {
                const [xcoord, ycoord] = xyToCanvasxy(xtick, gradStarty.value)
                axisLabelsAry.push({
                    text: xtick.toFixed(aO.figures),
                    x: xcoord - 5,
                    y: ycoord + 15,
                })
                xTicksAry.push({ num: xcoord, key: i })
            } else {
                const [xcoord, _] = xyToCanvasxy(xtick, gradStarty.value)
                xTicksMinorAry.push({ num: xcoord, key: i })
            }
            i++
        }
        i = 0

        aO = getAxisTicks(true)
        // console.log(aO)
        for (
            let ytick = Math.floor(gradStarty.value * 10) / 10;
            ytick < gradEndy.value;
            ytick += aO.step / aO.subDivs
        ) {
            if (i % aO.subDivs == 0) {
                let [xcoord, ycoord] = xyToCanvasxy(gradStartx.value, ytick)
                axisLabelsAry.push({
                    text: ytick.toFixed(aO.figures),
                    x: xcoord - 20,
                    y: ycoord,
                })

                const jhg = { num: ycoord, key: i }
                yTicksAry.push(jhg)
            } else {
                let [_, ycoord] = xyToCanvasxy(gradStartx.value, ytick)
                const jhg = { num: ycoord, key: i }
                yTicksMinorAry.push(jhg)
            }
            i++
        }
        xTicks.value = xTicksAry
        yTicks.value = yTicksAry
        xTicksMinor.value = xTicksMinorAry
        yTicksMinor.value = yTicksMinorAry
        axisLabels.value = axisLabelsAry
    }
    addGridLines()
}

function reScale() {
    gradEndx.value = 0.4
    gradEndy.value = 0.4
    drawStuff()
}

function setView() {
    const zoomfactor = 8 / Math.pow(zoom.value + 16, 1)

    const canvashide = document.getElementById("canvasoverflowhide")
    if (canvashide == null) {
        throw TypeError("No canvashide object")
    }
    const aspect = canvashide.offsetWidth / canvashide.offsetHeight
    gradStartx.value = scroll.value / 100 - zoomfactor * aspect - 0.16
    gradEndx.value = scroll.value / 100 + zoomfactor * aspect - 0.16
    gradStarty.value = scrolly.value / 100 - zoomfactor - 0.16
    gradEndy.value = scrolly.value / 100 + zoomfactor - 0.16
    drawStuff()
}

watch(scroll, (new_, old) => {
    setView()
})
watch(scrolly, (new_, old) => {
    setView()
})
watch(zoom, (new_, old) => {
    setView()
})

onMounted(() => {
    setView()
    drawStuff()
})
</script>
<template>
    <div>{{ squareSize }}</div>
    <input type="range" v-model.number="scroll" min="0" max="100" />
    <input type="range" v-model.number="scrolly" min="0" max="100" />
    <input type="range" v-model.number="zoom" min="0" max="100" />
    <button @click="reScale()">Change Scale</button>
    <div id="canvaswrap">
        <div id="canvasoverflowhide">
            <canvas id="myCanvas" width="45" height="45"></canvas>
        </div>
        <div id="overlays">
            <div
                class="specpoint"
                v-for="point of spectrumPoints"
                :key="point.nm"
                v-bind:style="{
                    left: `${point.x + 17}px`,
                    top: `${point.y - 14}px`,
                }"
            >
                {{ point.nm }}nm
            </div>
            <div
                class="colourpoint"
                v-for="point of colourLabels"
                :key="point.text"
                v-bind:style="{
                    left: `${point.x + 10}px`,
                    top: `${point.y + 1}px`,
                }"
            >
                {{ point.text }}
            </div>
        </div>
        <div id="overflowoverlays">
            <div
                class="axistick"
                v-for="point of axisLabels"
                v-bind:style="{
                    left: `${point.x - 10}px`,
                    top: `${point.y - 10}px`,
                }"
            >
                {{ point.text }}
            </div>
        </div>
        <svg viewBox="000 0 800 500" xmlns="http://www.w3.org/2000/svg">
            <!-- Example of a polygon with the default fill -->
            <polygon
                v-bind:points="gamutShadePoints"
                fill="rgba(150,150,150,0.6)"
            />
            <polygon
                v-bind:points="spectrumShadePoints"
                fill="rgba(238,238,238,0.9)"
            />
            <polygon
                v-bind:points="gamutStrokePoints"
                stroke="black"
                fill="none"
                stroke-width="2px"
            />
            <polyline
                v-bind:points="spectrumStrokePoints"
                stroke="black"
                fill="none"
                stroke-width="2px"
            />
            <polyline
                v-bind:points="blackbodyPoints"
                stroke="black"
                fill="none"
                stroke-width="2px"
            />
            <polyline
                v-bind:points="daylightPoints"
                stroke="black"
                fill="none"
                stroke-width="2px"
            />
            <line
                v-for="xTick of xTicks"
                :key="xTick.key"
                v-bind:x1="xTick.num"
                v-bind:x2="xTick.num"
                v-bind:y1="yStartCoord"
                v-bind:y2="yEndCoord"
                stroke="rgba(0,0,0,0.2)"
            />
            <line
                v-for="yTick of yTicks"
                :key="yTick.key"
                v-bind:x1="xStartCoord"
                v-bind:x2="xEndCoord"
                v-bind:y1="yTick.num"
                v-bind:y2="yTick.num"
                stroke="rgba(0,0,0,0.2)"
            />
            <line
                v-for="xTick of xTicksMinor"
                :key="xTick.key"
                v-bind:x1="xTick.num"
                v-bind:x2="xTick.num"
                v-bind:y1="yStartCoord"
                v-bind:y2="yEndCoord"
                stroke="rgba(0,0,0,0.05)"
            />
            <line
                v-for="yTick of yTicksMinor"
                :key="yTick.key"
                v-bind:x1="xStartCoord"
                v-bind:x2="xEndCoord"
                v-bind:y1="yTick.num"
                v-bind:y2="yTick.num"
                stroke="rgba(0,0,0,0.05)"
            />
            <circle
                v-for="point of spectrumPoints"
                v-bind:cx="point.x"
                v-bind:cy="point.y"
                r="3"
            />
            <circle
                v-for="point of colourLabels"
                v-bind:cx="point.x"
                v-bind:cy="point.y"
                r="3"
            />
        </svg>
    </div>
</template>
<style>
canvas {
    position: absolute;
}
.specpoint {
    position: absolute;
    font-size: 11pt;
    color: black;
    font-family: sans-serif;
}
.axistick {
    position: absolute;
    font-size: 11pt;
    color: black;
    font-family: sans-serif;
}

.colourpoint {
    position: absolute;
    font-size: 11pt;
    color: white;
    color: black;
    /* text-shadow: 2px 2px 4px black; */
    font-family: sans-serif;
}
#canvaswrap {
    width: 800px;
    height: 550px;
    position: relative;
    overflow: hidden;
}
#overlays {
    left: 100px;
    position: absolute;
    width: 800px;
    height: 500px;
    overflow: hidden;
}
#overflowoverlays {
    left: 100px;
    position: absolute;
    width: 800px;
    height: 550px;
    /* overflow: hidden; */
}
canvas {
    z-index: -2;
    position: absolute;
    overflow: hidden;
    left: 100px;
    transform-origin: 0 0;
    scale: 20;
}
#canvasoverflowhide {
    position: absolute;
    width: 800px;
    height: 500px;
    overflow: hidden;
}
svg {
    left: 100px;
    z-index: -1;
    display: block;
    position: absolute;
    width: 800px;
    height: 500px;
}
</style>
