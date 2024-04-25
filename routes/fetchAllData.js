async function fetchAndStoreSeriesData() {
    try {
        const seriesUrl = 'https://api.tcgdex.net/v2/en/series';
        const seriesResponse = await fetch(seriesUrl);
        const seriesListData = await seriesResponse.json();
        for (const series of seriesListData) {
            const seriesDetailsUrl = `https://api.tcgdex.net/v2/en/series/${series.id}`;
            const seriesDetailsResponse = await fetch(seriesDetailsUrl);
            const seriesDetailsData = await seriesDetailsResponse.json();
        }
        console.log('Series data fetched successfully.');
        return seriesListData;
    } catch (error) {
        console.error('Error fetching series data:', error);
    }
}


async function fetchAndStoreData() {
    try {
        console.log("Fetching series data...");
        const seriesUrl = 'https://api.tcgdex.net/v2/en/series';
        const seriesResponse = await fetch(seriesUrl);
        const seriesListData = await seriesResponse.json();
        console.log("Series data fetched successfully.");
        for (const series of seriesListData) {
            // console.log(`Fetching detailed information for series with ID: ${series.id}`);
            const seriesDetailsUrl = `https://api.tcgdex.net/v2/en/series/${series.id}`;
            const seriesDetailsResponse = await fetch(seriesDetailsUrl);
            const seriesDetailsData = await seriesDetailsResponse.json();
            // console.log(`Detailed information fetched successfully for series with ID: ${series.id}`);
        }
        console.log("Fetching data from multiple URLs concurrently...");
        const urls = [
            'https://api.tcgdex.net/v2/en/series/base',
            'https://api.tcgdex.net/v2/en/series/dp'
        ];
        const responses = await Promise.all(urls.map(url => fetch(url)));
        console.log("Data fetched successfully from multiple URLs.");
        console.log("Parsing JSON data from responses...");
        const seriesData = await Promise.all(responses.map(response => response.json()));
        console.log("JSON data parsed successfully.");
        const baseSeriesData = seriesData[0];
        const dpSeriesData = seriesData[1];
        const setIdsBaseSeries = baseSeriesData.sets.map(set => set.id);
        const setIdsDPSeries = dpSeriesData.sets.map(set => set.id);
        // Fetch set data for each set ID in the base series
        console.log("Fetching set data for each set ID in the base series...");
        const setDataBaseSeries = await Promise.all(setIdsBaseSeries.map(async setId => {
            const setUrl = `https://api.tcgdex.net/v2/en/sets/${setId}`;
            const setResponse = await fetch(setUrl);
            const setData = await setResponse.json();
            const cardDataPromises = setData.cards.map(async card => {
                const cardUrl = `https://api.tcgdex.net/v2/en/cards/${card.id}`;
                const cardResponse = await fetch(cardUrl);
                const cardData = await cardResponse.json();
                return cardData;
            });
            const cardData = await Promise.all(cardDataPromises);
            setData.cards = cardData;
            return setData;
        }));
        console.log("Set data from Base Series fetched successfully.");

        // Fetch set data for each set ID in the DP series
        console.log("Fetching set data for each set ID in the DP series...");
        const setDataDPSeries = await Promise.all(setIdsDPSeries.map(async setId => {
            const setUrl = `https://api.tcgdex.net/v2/en/sets/${setId}`;
            const setResponse = await fetch(setUrl);
            const setData = await setResponse.json();
            const cardDataPromises = setData.cards.map(async card => {
                const cardUrl = `https://api.tcgdex.net/v2/en/cards/${card.id}`;
                const cardResponse = await fetch(cardUrl);
                const cardData = await cardResponse.json();
                return cardData;
            });
            const cardData = await Promise.all(cardDataPromises);
            setData.cards = cardData;
            return setData;
        }));
        console.log("Set data from DP Series fetched successfully.");

        
        baseSeriesData.setDataBaseSeries = setDataBaseSeries;
        dpSeriesData.setDataDPSeries = setDataDPSeries;

        console.log("All data processing completed successfully.");
        return { baseSeriesData, dpSeriesData };
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}





module.exports = {
    fetchAndStoreData,
    fetchAndStoreSeriesData
};



