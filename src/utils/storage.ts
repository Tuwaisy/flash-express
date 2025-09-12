
/**
 * Retrieves an item from localStorage and parses it as JSON.
 * @param key The key of the item to retrieve.
 * @param defaultValue The default value to return if the item doesn't exist or if an error occurs.
 * @returns The parsed item from localStorage or the default value.
 */
export const getFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
        const item = window.localStorage.getItem(key);
        // If item is null or undefined, return defaultValue
        if (item === null || item === undefined) {
            return defaultValue;
        }
        return JSON.parse(item);
    } catch (error) {
        console.error(`Error reading from localStorage for key "${key}":`, error);
        return defaultValue;
    }
};

/**
 * Saves an item to localStorage after converting it to a JSON string.
 * @param key The key under which to store the item.
 * @param value The value to store. Can be any JSON-serializable type.
 */
export const saveToStorage = <T>(key: string, value: T): void => {
    try {
        if (value === undefined) {
             window.localStorage.removeItem(key);
        } else {
            const item = JSON.stringify(value);
            window.localStorage.setItem(key, item);
        }
    } catch (error) {
        console.error(`Error writing to localStorage for key "${key}":`, error);
    }
};
