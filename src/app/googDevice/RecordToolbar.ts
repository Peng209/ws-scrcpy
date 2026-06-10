import { ToolBox } from '../toolbox/ToolBox';
import SvgImage from '../ui/SvgImage';
import { ToolBoxButton } from '../toolbox/ToolBoxButton';
import { ToolBoxElement } from '../toolbox/ToolBoxElement';

const TAG = '[RecordToolbar]';
const RECORD_API_PORT = 8001;

function getRecordApiBase(): string {
    return `http://${location.hostname}:${RECORD_API_PORT}`;
}

export class RecordToolbar extends ToolBox {
    private readonly startButton: ToolBoxButton;
    private readonly stopButton: ToolBoxButton;
    private videoPath: string | null = null;
    private busy = false;

    private constructor(udid: string, elements: ToolBoxElement<any>[], startButton: ToolBoxButton, stopButton: ToolBoxButton) {
        super(elements);
        this.startButton = startButton;
        this.stopButton = stopButton;
        this.setRecordingState(false);

        startButton.addEventListener('click', () => {
            void this.onStart(udid);
        });
        stopButton.addEventListener('click', () => {
            void this.onStop(udid);
        });
    }

    public static create(udid: string): RecordToolbar {
        const startButton = new ToolBoxButton('开始录制', SvgImage.Icon.CAMERA);
        const stopButton = new ToolBoxButton('结束录制', SvgImage.Icon.POWER);
        return new RecordToolbar(udid, [startButton, stopButton], startButton, stopButton);
    }

    private setRecordingState(recording: boolean): void {
        this.startButton.getElement().disabled = recording || this.busy;
        this.stopButton.getElement().disabled = !recording || this.busy;
    }

    private setBusy(busy: boolean): void {
        this.busy = busy;
        this.setRecordingState(this.videoPath !== null);
    }

    private async onStart(udid: string): Promise<void> {
        if (this.busy || this.videoPath) {
            return;
        }

        this.setBusy(true);
        try {
            const response = await fetch(`${getRecordApiBase()}/record/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ udid }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                const detail = typeof payload.detail === 'string' ? payload.detail : '开始录制失败';
                throw new Error(detail);
            }
            if (typeof payload.video_path !== 'string') {
                throw new Error('开始录制失败：响应缺少 video_path');
            }
            this.videoPath = payload.video_path;
            this.setRecordingState(true);
        } catch (error) {
            console.error(TAG, error);
            alert(error instanceof Error ? error.message : '开始录制失败');
            this.setRecordingState(false);
        } finally {
            this.setBusy(false);
        }
    }

    private async onStop(udid: string): Promise<void> {
        if (this.busy || !this.videoPath) {
            return;
        }

        const videoPath = this.videoPath;
        this.setBusy(true);
        try {
            const response = await fetch(`${getRecordApiBase()}/record/stop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ udid, video_path: videoPath }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                const detail = typeof payload.detail === 'string' ? payload.detail : '结束录制失败';
                throw new Error(detail);
            }
            this.videoPath = null;
            this.setRecordingState(false);
        } catch (error) {
            console.error(TAG, error);
            alert(error instanceof Error ? error.message : '结束录制失败');
        } finally {
            this.setBusy(false);
        }
    }
}
