/* ctest.h
 *
 *              Defines a test framework for C projects.
 */
#ifndef CTEST_H
#define CTEST_H

#include <stdio.h>
#include <stdbool.h>

#define ct_test(test, cond) \
        ct_do_test(test, #cond, cond, __FILE__, __LINE__)
#define ct_fail(test, str)  \
        ct_do_fail(test, str, __FILE__, __LINE__)

typedef struct _Test Test;

typedef void (*TestFunc)(Test *);

/*!
 * \brief test case struct.
 */
struct _Test {
    char *name;                                 /* 该test case的名字 */
    FILE *pStream;                              /* report到哪个stream */
    size_t nTests;                              /* test items num */
    size_t maxTests;                            /* max num of test items */
    TestFunc *pTestFuns;                        /* test items array */
    long nPass;                                 /* num of success */
    long nFail;                                 /* num of failed */
};

#ifdef __cplusplus
extern "C" {
#endif

    Test *ct_create(
        const char *name,
        void (*init) (Test *));
    void ct_destroy(
        Test * pTest);

    const char *ct_getName(
        Test * pTest);
    long ct_getNumPassed(
        Test * pTest);
    long ct_getNumFailed(
        Test * pTest);
    long ct_getNumTests(
        Test * pTest);
    FILE *ct_getStream(
        Test * pTest);
    void ct_setStream(
        Test * pTest,
        FILE * stream);

    bool ct_addTestFunction(
        Test * pTest,
        TestFunc tfun);
    void ct_succeed(
        Test * pTest);
    long ct_run(
        Test * pTest);
    long ct_report(
        Test * pTest);
    void ct_reset(
        Test * pTest);

/* Not intended for end-users: */
    void ct_do_test(
        Test * pTest,
        const char *str,
        bool cond,
        const char *file,
        long line);
    void ct_do_fail(
        Test * pTest,
        const char *str,
        const char *file,
        long line);

#ifdef __cplusplus
}
#endif
#endif
