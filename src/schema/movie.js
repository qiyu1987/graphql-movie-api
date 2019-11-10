// src/schema/movie.js
import { makeExecutableSchema } from "graphql-tools"
import http from "request-promise-json"

const MOVIE_DB_API_KEY = process.env.MOVIE_DB_API_KEY

const typeDefs = `
type Query {
    movies: [Movie]
    movie(id: ID, imdb_id: String): Movie
    ratedMovies:[Movie]
}
type Mutation {
    rateMovie(id: ID!, rating: Int!): Int
}

type Movie {
    id: ID!
    imdb_id:String
    budget(currency: Currency = EUR):Int
    title:String!
    release_date:String
    production_companies:[ProductionCompany]
}
type ProductionCompany {
    id: Int!
    logo_path: String
    name: String!
    origin_country: String
}
enum Currency {
    EUR
    GBP
    USD
}
`

const resolvers = {
	Query: {
		movie: async (obj, args, context, info) => {
			if (args.id) {
				return http.get(
					`https://api.themoviedb.org/3/movie/${args.id}?api_key=${MOVIE_DB_API_KEY}&language=en-US`
				)
			}
			if (args.imdb_id) {
				const results = await http.get(
					`https://api.themoviedb.org/3/find/${args.imdb_id}?api_key=${MOVIE_DB_API_KEY}&language=en-US&external_source=imdb_id`
				)

				if (results.movie_results.length > 0) {
					const movieId = results.movie_results[0].id
					return http.get(
						`https://api.themoviedb.org/3/movie/${movieId}?api_key=${MOVIE_DB_API_KEY}&language=en-US`
					)
				}
			}
		},
		movies: async (obj, args, context, info) => {
			const { results } = await http.get(
				`https://api.themoviedb.org/3/discover/movie?primary_release_date.gte=2019-09-15&primary_release_date.lte=2019-11-10&api_key=${MOVIE_DB_API_KEY}&language=en-US`
			)
			return results
			// TODO: implement this
		},
		ratedMovies: async (obj, args, context, info) => {
			const guest_session = await getSessionId()
			const { results } = await http.get(
				`https://api.themoviedb.org/3/guest_session/${guest_session}/rated/movies?api_key=${MOVIE_DB_API_KEY}&language=en-US`
			)
			return results
		}
	},

	Mutation: {
		rateMovie: async (obj, args, context, info) => {
			const guest_session = await getSessionId()
			return await http
				.post(
					`https://api.themoviedb.org/3/movie/${args.id}/rating?api_key=${MOVIE_DB_API_KEY}&guest_session_id=${guest_session}&language=en-US`,
					{ value: args.rating }
				)
				.then(() => args.rating)
		}
	}
}
// Add this helper function to create a guest session.
let guestSessionObj
async function getSessionId() {
	guestSessionObj =
		guestSessionObj ||
		(await http.get(
			`https://api.themoviedb.org/3/authentication/guest_session/new?api_key=${MOVIE_DB_API_KEY}&language=en-US`
		))
	return guestSessionObj["guest_session_id"]
}

const schema = makeExecutableSchema({
	typeDefs,
	resolvers
})

export default schema
