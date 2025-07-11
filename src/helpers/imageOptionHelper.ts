export default function getImageOptions() {
    return {
        centered: false,
        getImage: (tagValue: string) => {
            const base64Data = tagValue.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
            return Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        },
        getSize: () => [150, 150],
    };
}
