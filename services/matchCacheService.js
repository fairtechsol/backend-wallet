const { getMatchFromCache } = require("./redis/commonFunctions");

exports.getTournamentBettingDetailsFromCache = async (id, matchId) => {
    const matchDetails = await getMatchFromCache(matchId);
    if (!matchDetails) return null;

    const {
        id: matchIdOnly,
        eventId,
        startAt,
        title,
        matchType,
        stopAt,
        betPlaceStartBefore,
        rateThan100,
        tournament: allTournamentBettings
    } = matchDetails;

    const match = {
        id: matchIdOnly,
        eventId,
        startAt,
        title,
        matchType,
        stopAt,
        betPlaceStartBefore,
        rateThan100
    };

    if (id) {
        const matchBetting = allTournamentBettings?.find(item => item?.id == id);
        const runners = matchBetting?.runners?.sort((a, b) => a.sortPriority - b.sortPriority);

        return {
            data: {
                match,
                matchBetting,
                runners
            }
        };
    }

    return {
        data: {
            match,
            matchBetting: allTournamentBettings
        }
    };
};
