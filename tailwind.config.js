const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
    content: ["./views/**/*.hbs"],
    theme: {
        fontFamily: {
            sans: ['Cairo', ...defaultTheme.fontFamily.sans]
        },
        extend: {
            colors: {
                veryDarkCharcoal: '#12171c',
                darkCharcoal: '#141E29',
                midCharcoal: '#1D2630',
                fireEngine: '#FB3640',
                coral: '#FE5C5C',
                meadow: '#38EDAC',
                grass: '#00A971',
            }
        },
    },
    plugins: [],
}
