import Foundation

// The guessable composer names, for suggestion chips. Answers live server-side.
enum Composers {
    static let names: [String] = [
        "Amy Beach",
        "Anton Bruckner",
        "Antonín Dvořák",
        "Antonio Vivaldi",
        "Barbara Strozzi",
        "Bedřich Smetana",
        "Camille Saint-Saëns",
        "Cécile Chaminade",
        "Clara Schumann",
        "Claude Debussy",
        "Dmitri Shostakovich",
        "Domenico Scarlatti",
        "Edvard Grieg",
        "Edward Elgar",
        "Erik Satie",
        "Ethel Smyth",
        "Eugène Ysaÿe",
        "Fanny Hensel",
        "Felix Mendelssohn",
        "Florence Price",
        "Franz Liszt",
        "Franz Schubert",
        "Frédéric Chopin",
        "Gabriel Fauré",
        "George Frideric Handel",
        "George Gershwin",
        "Georges Bizet",
        "Giacomo Puccini",
        "Gioachino Rossini",
        "Giuseppe Verdi",
        "Gustav Holst",
        "Gustav Mahler",
        "Hector Berlioz",
        "Hildegard von Bingen",
        "Igor Stravinsky",
        "Jacques Offenbach",
        "Jean Sibelius",
        "Jean-Baptiste Lully",
        "Johann Pachelbel",
        "Johann Sebastian Bach",
        "Johann Strauss II",
        "Johannes Brahms",
        "Joseph Haydn",
        "Lili Boulanger",
        "Louise Farrenc",
        "Ludwig van Beethoven",
        "Maurice Ravel",
        "Max Bruch",
        "Modest Mussorgsky",
        "Moritz Moszkowski",
        "Niccolò Paganini",
        "Nikolai Rimsky-Korsakov",
        "Pyotr Ilyich Tchaikovsky",
        "Richard Strauss",
        "Richard Wagner",
        "Robert Schumann",
        "Sergei Prokofiev",
        "Sergei Rachmaninoff",
        "Wolfgang Amadeus Mozart",
    ]

    static func normalize(_ s: String) -> String {
        s.folding(options: .diacriticInsensitive, locale: .current).lowercased()
            .filter { $0.isLetter || $0.isNumber || $0 == " " }
    }

    static func suggest(_ prefix: String, limit: Int = 4) -> [String] {
        let p = normalize(prefix).trimmingCharacters(in: .whitespaces)
        guard p.count >= 1 else { return [] }
        return names.filter { normalize($0).contains(p) }.prefix(limit).map { $0 }
    }
}
