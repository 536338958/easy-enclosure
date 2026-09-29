import measureBoundingBox from '@jscad/modeling/src/measurements/measureBoundingBox';

import { DEFAULT_PARAMS, InternalWall, cloneParams } from '../params';
import { cavityFloorZ } from './dimensions';
import { internalWalls } from './internalwalls';
import { pcbMountsOnBase } from './pcbmount';

const oneWall = (height: number): InternalWall[] => [
  { x: 0, y: 0, height, length: 25, thickness: 2, rotation: 0 },
];

describe('internalWalls', () => {
  it('sits on the floor thickness when lid screws are enabled', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.lidScrews = true;
    params.floor = 3;
    params.internalWalls = oneWall(10);

    const [[, , zMin]] = measureBoundingBox(internalWalls(params));

    expect(zMin).toBeCloseTo(3, 6);
  });

  // 回归：内隔板曾用裸 floor 作基准，而 hollowRoundCube（lidScrews=false 分支）
  // 的内腔底在 z=wall，关闭盖板螺丝后隔板会陷进基座地板。
  it('follows the wall inset instead of floor when lid screws are disabled', () => {
    const params = cloneParams(DEFAULT_PARAMS);
    params.lidScrews = false;
    params.waterProof = false;
    params.wall = 1.5;
    params.floor = 3;
    params.internalWalls = oneWall(10);

    const [[, , zMin]] = measureBoundingBox(internalWalls(params));

    expect(zMin).toBeCloseTo(1.5, 6);
    expect(zMin).toBeCloseTo(cavityFloorZ(params), 6);
  });

  it('shares its floor datum with the PCB mounts in every lidScrews/waterProof combination', () => {
    [true, false].forEach((lidScrews) => {
      [true, false].forEach((waterProof) => {
        const params = cloneParams(DEFAULT_PARAMS);
        params.lidScrews = lidScrews;
        params.waterProof = waterProof;
        params.floor = 3;
        params.wall = 1.5;
        params.internalWalls = oneWall(10);
        params.pcbMounts = [
          {
            surface: 'bottom',
            x: 0,
            y: 0,
            height: 5,
            outerDiameter: 6,
            screwDiameter: 2,
          },
        ];

        const wallBottom = measureBoundingBox(internalWalls(params))[0][2];
        const mounts = pcbMountsOnBase(params);
        expect(mounts).not.toBeNull();
        const mountBottom = measureBoundingBox(mounts!)[0][2];

        expect(wallBottom).toBeCloseTo(mountBottom, 6);
      });
    });
  });
});
