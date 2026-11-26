export function validateDeviceId(value: unknown): asserts value is string {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) {
        throw new Error('DeviceText must contain only letters, digits, underscores, or hyphens');
    }
}
